import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const COLORS = [
  '#10b981', '#0ea5e9', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
]

export default function TrendChart({ data, blocks }) {
  if (!data || data.length === 0) return null

  const chartData = data.map(week => {
    const row = { week: format(new Date(week.week_start), 'dd/MM', { locale: vi }) }
    blocks.forEach(b => {
      const wd = week.blockData?.[b.id]
      row[b.name] = wd?.ptsTotal ?? null
    })
    return row
  })

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Xu hướng điểm số theo tuần
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: 'var(--tooltip-bg, #fff)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value, name) => [value ? value.toFixed(1) : '—', name]}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          {blocks.map((b, i) => (
            <Line
              key={b.id}
              type="monotone"
              dataKey={b.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
