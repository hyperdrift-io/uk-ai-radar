import { createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { type AnalysedItem, AnalysedItemSchema } from './schemas'

function defaultPath(): string {
  return join(process.cwd(), 'data', 'cache.sqlite')
}

let _db: Database.Database | null = null

function db(path: string = defaultPath()): Database.Database {
  if (_db) return _db
  mkdirSync(dirname(path), { recursive: true })
  const conn = new Database(path)
  conn.pragma('journal_mode = WAL')
  conn.exec(`
    CREATE TABLE IF NOT EXISTS page_hashes (
      url TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );
  `)

  // Schema-migrate analysed_items. The earlier schema stored only the
  // extraction subset; the current one stores the full AnalysedItem so search
  // works. Items are regenerable for the cost of one LLM call each, so dropping
  // and recreating is safe.
  const cols = conn
    .prepare<[], { name: string }>('PRAGMA table_info(analysed_items)')
    .all()
    .map((r) => r.name)
  const hasNewSchema = cols.includes('item_json') && cols.includes('kind') && cols.includes('source_host')
  if (cols.length > 0 && !hasNewSchema) {
    conn.exec('DROP TABLE analysed_items')
  }

  conn.exec(`
    CREATE TABLE IF NOT EXISTS analysed_items (
      source_url TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      item_json TEXT NOT NULL,
      kind TEXT NOT NULL,
      deadline TEXT,
      source_host TEXT NOT NULL,
      analysed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_analysed_kind ON analysed_items(kind);
    CREATE INDEX IF NOT EXISTS idx_analysed_deadline ON analysed_items(deadline);
    CREATE INDEX IF NOT EXISTS idx_analysed_source_host ON analysed_items(source_host);
  `)
  _db = conn
  return conn
}

export function hashContent(body: string): string {
  return createHash('sha256').update(body).digest('hex')
}

/**
 * Record this fetch. Returns `true` if the content is new or changed vs the last
 * stored hash for this URL, `false` if it is identical.
 *
 * Note: used at the FEED level for telemetry only. Per-item reuse goes through
 * `loadItem` / `storeItem` so the brief is always a full snapshot.
 */
export function recordAndDiff(url: string, body: string): { changed: boolean; hash: string } {
  const hash = hashContent(body)
  const fetchedAt = new Date().toISOString()
  const row = db()
    .prepare<[string], { content_hash: string }>('SELECT content_hash FROM page_hashes WHERE url = ?')
    .get(url)

  if (row && row.content_hash === hash) {
    db().prepare('UPDATE page_hashes SET fetched_at = ? WHERE url = ?').run(fetchedAt, url)
    return { changed: false, hash }
  }

  db()
    .prepare(
      'INSERT INTO page_hashes (url, content_hash, fetched_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(url) DO UPDATE SET content_hash = excluded.content_hash, fetched_at = excluded.fetched_at',
    )
    .run(url, hash, fetchedAt)
  return { changed: true, hash }
}

/**
 * Look up a previously-analysed item. Returns the full AnalysedItem if the
 * stored record matches the current contentHash, else null.
 */
export function loadItem(sourceUrl: string, contentHash: string): AnalysedItem | null {
  const row = db()
    .prepare<[string], { content_hash: string; item_json: string }>(
      'SELECT content_hash, item_json FROM analysed_items WHERE source_url = ?',
    )
    .get(sourceUrl)
  if (!row || row.content_hash !== contentHash) return null
  try {
    return AnalysedItemSchema.parse(JSON.parse(row.item_json))
  } catch {
    return null
  }
}

export function storeItem(item: AnalysedItem): void {
  db()
    .prepare(
      'INSERT INTO analysed_items (source_url, content_hash, item_json, kind, deadline, source_host, analysed_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(source_url) DO UPDATE SET content_hash = excluded.content_hash, item_json = excluded.item_json, ' +
        'kind = excluded.kind, deadline = excluded.deadline, source_host = excluded.source_host, analysed_at = excluded.analysed_at',
    )
    .run(
      item.sourceUrl,
      item.contentHash,
      JSON.stringify(item),
      item.kind,
      item.deadline,
      item.sourceHost,
      new Date().toISOString(),
    )
}

/** Every analysed item, soonest deadline first, undated last. */
export function listItems(limit = 100): AnalysedItem[] {
  const rows = db()
    .prepare<[number], { item_json: string }>(
      "SELECT item_json FROM analysed_items ORDER BY COALESCE(deadline, '9999') ASC, analysed_at DESC LIMIT ?",
    )
    .all(limit)
  const out: AnalysedItem[] = []
  for (const r of rows) {
    try {
      out.push(AnalysedItemSchema.parse(JSON.parse(r.item_json)))
    } catch {
      // skip malformed rows silently
    }
  }
  return out
}

export function listSourceHosts(): string[] {
  const rows = db()
    .prepare<[], { source_host: string }>('SELECT DISTINCT source_host FROM analysed_items ORDER BY source_host')
    .all()
  return rows.map((r) => r.source_host)
}

export function resetCacheForTests(path?: string): void {
  if (_db) {
    _db.close()
    _db = null
  }
  if (path) {
    db(path)
  }
}
