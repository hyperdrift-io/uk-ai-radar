import type { Digest, RankedItem } from './schemas'

export function renderMarkdown(digest: Digest): string {
  const date = new Date(digest.generatedAt).toISOString().slice(0, 10)
  const lines: string[] = []
  lines.push(`# UK AI Radar — brief for \`${digest.profile}\``)
  lines.push('')
  lines.push(`_Generated ${date}. ${digest.itemCount} ranked items. Independent project, not affiliated with HM Government._`)
  lines.push('')

  if (digest.items.length === 0) {
    lines.push('No new items above the relevance threshold this run.')
    return lines.join('\n')
  }

  for (const item of digest.items) {
    lines.push(`## ${item.rank}. ${item.title}`)
    lines.push('')
    lines.push(meta(item))
    lines.push('')
    lines.push(`**Angle:** ${item.angle}`)
    lines.push('')
    lines.push(`> ${item.summary}`)
    lines.push('')
    lines.push(`Source: <${item.sourceUrl}>`)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

function meta(item: RankedItem): string {
  const parts: string[] = [`Kind: **${item.kind}**`]
  if (item.body) parts.push(`Body: ${item.body}`)
  if (item.deadline) parts.push(`Deadline: **${item.deadline}**`)
  if (item.amount) parts.push(`Amount: ${item.amount}`)
  parts.push(`Fit: ${item.fitScore.toFixed(2)}`)
  parts.push(`Actionability: ${item.actionability.toFixed(2)}`)
  return parts.join(' · ')
}
