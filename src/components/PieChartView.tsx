import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type PieLabelRenderProps,
} from 'recharts'
import './PieChartView.css'

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#64748b',
]

const PIE_SLICE_LIMIT = 8
const RADIAN = Math.PI / 180

export interface ChartSlice {
  name: string
  value: number
}

interface PieChartViewProps {
  title: string
  data: ChartSlice[]
  valueFormatter?: (value: number) => string
  centerLabel?: string
  emptyMessage?: string
}

function buildPieData(items: ChartSlice[]): ChartSlice[] {
  const sorted = [...items].sort((a, b) => b.value - a.value)
  if (sorted.length <= PIE_SLICE_LIMIT) return sorted

  const top = sorted.slice(0, PIE_SLICE_LIMIT - 1)
  const rest = sorted.slice(PIE_SLICE_LIMIT - 1)
  const otherValue = rest.reduce((sum, item) => sum + item.value, 0)
  return [...top, { name: 'その他', value: otherValue }]
}

function getLabelThreshold(sliceCount: number): number {
  if (sliceCount <= 4) return 0.05
  if (sliceCount <= 6) return 0.07
  return 0.09
}

function renderSliceLabel(threshold: number) {
  return (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, outerRadius, percent, name } = props
    if (!cx || !cy || midAngle === undefined || !outerRadius || !percent || !name) {
      return null
    }
    if (percent < threshold) return null

    const shortName = name.length > 10 ? `${name.slice(0, 9)}…` : name
    const radius = Number(outerRadius) + 16
    const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN)
    const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="#e2e8f0"
        textAnchor={x > Number(cx) ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={11}
      >
        {shortName}
      </text>
    )
  }
}

export function PieChartView({
  title,
  data,
  valueFormatter = (v) => v.toLocaleString('ja-JP'),
  centerLabel = '合計',
  emptyMessage = 'データがありません',
}: PieChartViewProps) {
  const filtered = data
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  if (filtered.length === 0) {
    return (
      <div className="pie-chart-view">
        <h3>{title}</h3>
        <p className="pie-empty">{emptyMessage}</p>
      </div>
    )
  }

  const total = filtered.reduce((sum, item) => sum + item.value, 0)
  const pieData = buildPieData(filtered)
  const labelThreshold = getLabelThreshold(pieData.length)

  const getColor = (name: string) => {
    const index = filtered.findIndex((item) => item.name === name)
    if (index >= 0) return COLORS[index % COLORS.length]
    return COLORS[PIE_SLICE_LIMIT - 1]
  }

  return (
    <div className="pie-chart-view">
      <h3>{title}</h3>
      <div className="pie-chart-wrapper">
        <ResponsiveContainer width="100%" height={240}>
          <RechartsPie>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={72}
              innerRadius={48}
              paddingAngle={1}
              stroke="none"
              label={renderSliceLabel(labelThreshold)}
              labelLine={{
                stroke: '#64748b',
                strokeWidth: 1,
              }}
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={getColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name, item) => [
                valueFormatter(value),
                item.payload.name,
              ]}
            />
          </RechartsPie>
        </ResponsiveContainer>
        <div className="pie-center">
          <div className="pie-center-value">{valueFormatter(total)}</div>
          <div className="pie-center-label">{centerLabel}</div>
        </div>
      </div>

      <ul className="pie-breakdown">
        {filtered.map((item, index) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0
          return (
            <li key={item.name} className="pie-breakdown-item">
              <span
                className="pie-breakdown-dot"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              <span className="pie-breakdown-name" title={item.name}>{item.name}</span>
              <span className="pie-breakdown-value">{valueFormatter(item.value)}</span>
              <span className="pie-breakdown-percent">{percent.toFixed(1)}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
