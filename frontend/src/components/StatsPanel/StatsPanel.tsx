import './StatsPanel.css'

interface DeckStats {
  totalCards: number
  uniqueCards: number
  averageCMC: number
  totalPrice: number
  colorDistribution: Record<string, number>
  typeDistribution: Record<string, number>
  manaCurve: Record<number, number>
  landCount: number
  nonlandCount: number
  creatureCount: number
}

interface StatsPanelProps {
  stats: DeckStats
}

const TYPE_LABELS: Record<string, string> = {
  creature: 'Creatures',
  instant: 'Instants',
  sorcery: 'Sorceries',
  enchantment: 'Enchantments',
  artifact: 'Artifacts',
  planeswalker: 'Planeswalkers',
  land: 'Lands',
  other: 'Other',
}

const colorNames: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
}

const colorClasses: Record<string, string> = {
  W: 'color-white',
  U: 'color-blue',
  B: 'color-black',
  R: 'color-red',
  G: 'color-green',
  C: 'color-colorless',
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  // Build mana curve array for display
  const manaCurveArray = [0, 1, 2, 3, 4, 5, 6, 7].map((cmc) => ({
    cmc,
    count: stats.manaCurve[cmc] || 0,
  }))

  const maxCurve = Math.max(...manaCurveArray.map((m) => m.count), 1)
  const maxColor = Math.max(...Object.values(stats.colorDistribution), 1)

  // Filter out zero-count types
  const activeTypes = Object.entries(stats.typeDistribution).filter(([, count]) => count > 0)

  // Filter out zero-count colors
  const activeColors = Object.entries(stats.colorDistribution).filter(([, count]) => count > 0)

  return (
    <div className="stats-panel">
      <div className="panel-header">
        <h3>📊 Statistics</h3>
      </div>

      <div className="stats-content">
        {/* Quick Stats */}
        <div className="stat-section">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.totalCards}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.landCount}</span>
              <span className="stat-label">Lands</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.averageCMC.toFixed(1)}</span>
              <span className="stat-label">Avg CMC</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">${stats.totalPrice.toFixed(0)}</span>
              <span className="stat-label">Price</span>
            </div>
          </div>
        </div>

        {/* Mana Curve */}
        <div className="stat-section">
          <h4>Mana Curve</h4>
          <div className="mana-curve">
            {manaCurveArray.map((item) => (
              <div key={item.cmc} className="curve-bar">
                <div
                  className="bar-fill"
                  style={{ height: item.count > 0 ? `${(item.count / maxCurve) * 100}%` : '4px' }}
                >
                  {item.count > 0 && <span className="bar-count">{item.count}</span>}
                </div>
                <span className="bar-label">{item.cmc === 7 ? '7+' : item.cmc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Color Distribution */}
        <div className="stat-section">
          <h4>Colors</h4>
          {activeColors.length === 0 ? (
            <div className="empty-stat">No cards yet</div>
          ) : (
            <div className="color-distribution">
              {['W', 'U', 'B', 'R', 'G', 'C'].map((color) => {
                const count = stats.colorDistribution[color] || 0
                if (count === 0) return null
                return (
                  <div key={color} className="color-bar">
                    <div className="color-info">
                      <span className={`color-pip ${colorClasses[color]}`}>{color}</span>
                      <span className="color-name">{colorNames[color]}</span>
                    </div>
                    <div className="color-bar-container">
                      <div
                        className={`color-bar-fill ${colorClasses[color]}`}
                        style={{ width: `${(count / maxColor) * 100}%` }}
                      />
                    </div>
                    <span className="color-count">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Type Distribution */}
        <div className="stat-section">
          <h4>Card Types</h4>
          {activeTypes.length === 0 ? (
            <div className="empty-stat">No cards yet</div>
          ) : (
            <div className="type-distribution">
              {activeTypes.map(([type, count]) => (
                <div key={type} className="type-row">
                  <span className="type-name">{TYPE_LABELS[type] || type}</span>
                  <span className="type-count">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel-footer">
        <small>📈 Stats update live</small>
      </div>
    </div>
  )
}
