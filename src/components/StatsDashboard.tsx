import { useEffect } from 'react'
import type { AggregateStats } from '../types'
import { PieChartView } from './PieChartView'
import { ExcludedLanguageNotes } from './ExcludedLanguageNotes'
import { formatBytes, formatLines } from '../utils/format'
import './StatsDashboard.css'

interface StatsDashboardProps {
  stats: AggregateStats | null
  loading: boolean
  refreshing?: boolean
  error: string | null
  projectIds: string[]
  isStatsComplete: boolean
  onEnsureStats: (projectIds: string[]) => void
  onRefresh: () => void
}

export function StatsDashboard({
  stats,
  loading,
  refreshing = false,
  error,
  projectIds,
  isStatsComplete,
  onEnsureStats,
  onRefresh,
}: StatsDashboardProps) {
  useEffect(() => {
    if (projectIds.length === 0) return
    if (!isStatsComplete && !loading) {
      onEnsureStats(projectIds)
    }
  }, [projectIds, isStatsComplete, loading, onEnsureStats])

  if (loading && !stats) {
    return (
      <section className="stats-dashboard">
        <div className="panel-header">
          <h2>統計</h2>
        </div>
        <div className="stats-scroll-body">
          <p className="stats-loading">tokei でコード量を集計中...</p>
        </div>
      </section>
    )
  }

  if (error && !stats) {
    return (
      <section className="stats-dashboard">
        <div className="panel-header">
          <h2>統計</h2>
          <button type="button" className="btn-small" onClick={onRefresh}>再取得</button>
        </div>
        <div className="stats-scroll-body">
          <p className="stats-error">{error}</p>
        </div>
      </section>
    )
  }

  if (!stats) return null

  const projectsWithLanguages = stats.projects.filter((p) => p.languages.length > 0)
  const projectsWithExcluded = stats.projects.filter(
    (p) => p.excludedLanguages && p.excludedLanguages.length > 0,
  )
  const tokeiWarning = stats.projects.find((p) => p.tokeiWarning)?.tokeiWarning

  return (
    <section className="stats-dashboard">
      <div className="panel-header">
        <h2>統計</h2>
        <div className="stats-header-actions">
          {refreshing && stats && <span className="stats-refreshing-hint">更新中...</span>}
          <button
            type="button"
            className="btn-small"
            onClick={onRefresh}
            disabled={loading || refreshing}
          >
            {loading || refreshing ? '取得中...' : '再取得'}
          </button>
        </div>
      </div>

      <div className="stats-scroll-body">
      {tokeiWarning && (
        <p className="stats-tokei-warning">{tokeiWarning}</p>
      )}

      {projectsWithExcluded.length > 0 && (
        <div className="excluded-language-notes global">
          <p className="excluded-language-title">参考値（集計除外）</p>
          <p className="excluded-language-hint">
            1プロジェクト・1言語が100万行を超えた言語は、総行数・グラフ・フォルダ別集計から除外しています。
          </p>
          <ul className="excluded-language-list">
            {projectsWithExcluded.flatMap((project) =>
              (project.excludedLanguages ?? []).map((item) => (
                <li key={`${project.projectId}-${item.language}`}>
                  <span className="excluded-language-project">{project.name}</span>
                  <span className="excluded-language-name">{item.language}</span>
                  <span className="excluded-language-lines">{formatLines(item.lines)} 行（参考値）</span>
                </li>
              )),
            )}
          </ul>
        </div>
      )}

      <div className="stats-summary">
        <div className="summary-card">
          <span className="summary-label">総容量</span>
          <span className="summary-value">{formatBytes(stats.totalSizeBytes)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">総コード行数</span>
          <span className="summary-value">{formatLines(stats.totalLines)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">登録フォルダ数</span>
          <span className="summary-value">{stats.projects.length}</span>
        </div>
      </div>

      <div className="stats-charts">
        <PieChartView
          title="全体の言語別コード量"
          data={stats.byLanguage.map((l) => ({ name: l.language, value: l.lines }))}
          valueFormatter={(v) => `${formatLines(v)} 行`}
          centerLabel="総行数"
          emptyMessage="コード行数データがありません（tokei が必要です）"
        />
        <PieChartView
          title="フォルダ別容量"
          data={stats.byFolderSize.map((f) => ({ name: f.name, value: f.sizeBytes }))}
          valueFormatter={(v) => formatBytes(v)}
          centerLabel="総容量"
          emptyMessage="容量データがありません"
        />
        <PieChartView
          title="フォルダ別コード量"
          data={stats.byFolderLines.map((f) => ({ name: f.name, value: f.lines }))}
          valueFormatter={(v) => `${formatLines(v)} 行`}
          centerLabel="総行数"
          emptyMessage="コード行数データがありません"
        />
      </div>

      {projectsWithLanguages.length > 0 && (
        <div className="stats-per-folder-section">
          <h3>フォルダ別言語構成</h3>
          <div className="stats-charts stats-per-folder-charts">
            {projectsWithLanguages.map((project) => (
              <div key={project.projectId} className="stats-per-folder-chart-wrap">
                <PieChartView
                  title={project.name}
                  data={project.languages.map((l) => ({ name: l.language, value: l.lines }))}
                  valueFormatter={(v) => `${formatLines(v)} 行`}
                  centerLabel="合計"
                />
                {project.excludedLanguages && project.excludedLanguages.length > 0 && (
                  <ExcludedLanguageNotes
                    items={project.excludedLanguages}
                    projectName={project.name}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stats-table-section">
        <h3>フォルダ別詳細</h3>
        <table className="stats-table">
          <thead>
            <tr>
              <th>フォルダ</th>
              <th>容量</th>
              <th>コード行数</th>
              <th>主要言語</th>
            </tr>
          </thead>
          <tbody>
            {stats.projects.map((p) => (
              <tr key={p.projectId}>
                <td>{p.name}</td>
                <td>{formatBytes(p.sizeBytes)}</td>
                <td>
                  {formatLines(p.totalLines)}
                  {p.excludedLanguages && p.excludedLanguages.length > 0 && (
                    <span className="stats-excluded-hint" title="100万行超の言語は集計除外">
                      ※参考値あり
                    </span>
                  )}
                </td>
                <td>{p.languages.slice(0, 3).map((l) => l.language).join(', ') || '—'}</td>
              </tr>
            ))}
            {stats.projects.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-row">登録フォルダがありません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </section>
  )
}
