import { createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import type { AnalystExtraction } from './schemas'

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
    CREATE TABLE IF NOT EXISTS analysed_items (
      source_url TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      analysis_json TEXT NOT NULL,
      analysed_at TEXT NOT NULL
    );
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
 * `loadAnalysis` / `storeAnalysis` so the brief is always a full snapshot.
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
 * Look up a previously-analysed item. Returns the extraction if the stored
 * record matches the current contentHash (i.e. the item has not changed since
 * we last analysed it), else null.
 */
export function loadAnalysis(sourceUrl: string, contentHash: string): AnalystExtraction | null {
  const row = db()
    .prepare<[string], { content_hash: string; analysis_json: string }>(
      'SELECT content_hash, analysis_json FROM analysed_items WHERE source_url = ?',
    )
    .get(sourceUrl)
  if (!row || row.content_hash !== contentHash) return null
  try {
    return JSON.parse(row.analysis_json) as AnalystExtraction
  } catch {
    return null
  }
}

export function storeAnalysis(
  sourceUrl: string,
  contentHash: string,
  extraction: AnalystExtraction,
): void {
  db()
    .prepare(
      'INSERT INTO analysed_items (source_url, content_hash, analysis_json, analysed_at) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT(source_url) DO UPDATE SET content_hash = excluded.content_hash, analysis_json = excluded.analysis_json, analysed_at = excluded.analysed_at',
    )
    .run(sourceUrl, contentHash, JSON.stringify(extraction), new Date().toISOString())
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
