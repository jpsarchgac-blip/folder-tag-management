import type { ExcludedLanguageStat } from '../types'
import { LARGE_LANGUAGE_LINE_THRESHOLD } from '../types'
import { formatLines } from '../utils/format'
import './ExcludedLanguageNotes.css'

interface ExcludedLanguageNotesProps {
  items: ExcludedLanguageStat[]
  projectName?: string
}

export function ExcludedLanguageNotes({ items, projectName }: ExcludedLanguageNotesProps) {
  if (!items.length) return null

  const thresholdLabel = `${(LARGE_LANGUAGE_LINE_THRESHOLD / 1_000_000).toLocaleString('ja-JP')}百万`

  return (
    <div className="excluded-language-notes">
      <p className="excluded-language-title">参考値（集計除外）</p>
      <p className="excluded-language-hint">
        {projectName ? `「${projectName}」で` : ''}
        1言語が{thresholdLabel}行を超えたため、以下は行数集計・グラフに含めていません。
      </p>
      <ul className="excluded-language-list">
        {items.map((item) => (
          <li key={item.language}>
            <span className="excluded-language-name">{item.language}</span>
            <span className="excluded-language-lines">{formatLines(item.lines)} 行（参考値）</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
