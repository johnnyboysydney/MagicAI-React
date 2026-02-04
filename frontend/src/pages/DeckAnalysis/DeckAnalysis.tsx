import { useState } from 'react'
import { Link } from 'react-router-dom'
import './DeckAnalysis.css'

export default function DeckAnalysis() {
  const [showFreeAnalysis, setShowFreeAnalysis] = useState(true)
  const [quickVerdictLoading, setQuickVerdictLoading] = useState(false)
  const [fullAnalysisLoading, setFullAnalysisLoading] = useState(false)

  // Placeholder data
  const deckName = "Untitled Deck"
  const creditBalance = 999
  const totalCards = 60
  const landCount = 24
  const landPercentage = ((landCount / totalCards) * 100).toFixed(1)

  const handleQuickVerdict = () => {
    setQuickVerdictLoading(true)
    // TODO: Implement AI quick verdict
    setTimeout(() => setQuickVerdictLoading(false), 2000)
  }

  const handleFullAnalysis = () => {
    setFullAnalysisLoading(true)
    // TODO: Implement AI full analysis
    setTimeout(() => setFullAnalysisLoading(false), 3000)
  }

  return (
    <div className="deck-analysis-page">
      {/* Header */}
      <div className="analysis-header">
        <div className="header-left">
          <Link to="/deck-builder" className="back-link">
            ← Back to Builder
          </Link>
          <h1>{deckName}</h1>
          <span className="deck-meta">{totalCards} cards • Standard</span>
        </div>
        <div className="header-right">
          <div className="credit-display">
            <span className="credit-icon">⚡</span>
            <span className="credit-amount">{creditBalance}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="analysis-content">
        {/* Left Column - Deck Summary */}
        <div className="deck-summary-column">
          <div className="summary-card">
            <h3>📋 Deck Overview</h3>
            <div className="overview-stats">
              <div className="stat-row">
                <span>Total Cards</span>
                <span className="stat-value">{totalCards}</span>
              </div>
              <div className="stat-row">
                <span>Lands</span>
                <span className="stat-value">{landCount} ({landPercentage}%)</span>
              </div>
              <div className="stat-row">
                <span>Non-lands</span>
                <span className="stat-value">{totalCards - landCount}</span>
              </div>
              <div className="stat-row">
                <span>Avg. Mana Cost</span>
                <span className="stat-value">2.4</span>
              </div>
              <div className="stat-row">
                <span>Est. Price</span>
                <span className="stat-value">$245.50</span>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <h3>🎨 Colors</h3>
            <div className="color-pips">
              <span className="pip pip-white" title="White">W</span>
              <span className="pip pip-blue" title="Blue">U</span>
              <span className="pip pip-red active" title="Red">R</span>
              <span className="pip pip-black" title="Black">B</span>
              <span className="pip pip-green active" title="Green">G</span>
            </div>
          </div>

          <Link to="/deck-builder" className="edit-deck-btn">
            ✏️ Edit Deck
          </Link>
        </div>

        {/* Right Column - Analysis */}
        <div className="analysis-column">
          {/* AI Analysis Section */}
          <div className="analysis-section ai-section">
            <div className="section-header">
              <div className="section-title">
                <span className="ai-icon">🤖</span>
                <h2>AI-Powered Analysis</h2>
              </div>
              <div className="credit-badge">
                <span>⚡ {creditBalance}</span>
              </div>
            </div>

            <div className="ai-buttons">
              <button
                className="ai-btn quick-btn"
                onClick={handleQuickVerdict}
                disabled={quickVerdictLoading}
              >
                <span className="btn-icon">⚡</span>
                <span className="btn-text">
                  {quickVerdictLoading ? 'Analyzing...' : 'Quick Verdict'}
                </span>
                <span className="btn-cost">1 ⚡</span>
              </button>

              <button
                className="ai-btn full-btn"
                onClick={handleFullAnalysis}
                disabled={fullAnalysisLoading}
              >
                <span className="btn-icon">🧠</span>
                <span className="btn-text">
                  {fullAnalysisLoading ? 'Deep Analysis...' : 'Full Analysis'}
                </span>
                <span className="btn-cost">3 ⚡</span>
              </button>
            </div>

            <p className="ai-description">
              Get AI-powered insights including archetype detection, power level rating,
              strengths, weaknesses, and personalized suggestions.
            </p>
          </div>

          {/* Free Analysis Section */}
          <div className="analysis-section free-section">
            <div
              className="section-header clickable"
              onClick={() => setShowFreeAnalysis(!showFreeAnalysis)}
            >
              <div className="section-title">
                <span className="free-icon">📊</span>
                <h2>Free Analysis</h2>
                <span className="free-badge">FREE</span>
              </div>
              <span className={`expand-icon ${showFreeAnalysis ? 'expanded' : ''}`}>
                ▼
              </span>
            </div>

            {showFreeAnalysis && (
              <div className="free-analysis-content">
                {/* Mana Curve */}
                <div className="analysis-card">
                  <h4>📈 Mana Curve</h4>
                  <div className="mana-curve-horizontal">
                    {[
                      { cmc: 0, count: 4, label: '0' },
                      { cmc: 1, count: 12, label: '1' },
                      { cmc: 2, count: 14, label: '2' },
                      { cmc: 3, count: 8, label: '3' },
                      { cmc: 4, count: 4, label: '4' },
                      { cmc: 5, count: 2, label: '5' },
                      { cmc: 6, count: 0, label: '6+' },
                    ].map((item) => (
                      <div key={item.cmc} className="curve-row">
                        <span className="curve-label">{item.label}</span>
                        <div className="curve-bar-container">
                          <div
                            className="curve-bar-fill"
                            style={{ width: `${(item.count / 14) * 100}%` }}
                          />
                        </div>
                        <span className="curve-count">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Type Distribution */}
                <div className="analysis-card">
                  <h4>🃏 Card Types</h4>
                  <div className="type-distribution">
                    {[
                      { type: 'Creatures', count: 16, color: '#22c55e' },
                      { type: 'Instants', count: 12, color: '#3b82f6' },
                      { type: 'Sorceries', count: 4, color: '#ef4444' },
                      { type: 'Enchantments', count: 2, color: '#a855f7' },
                      { type: 'Artifacts', count: 2, color: '#6b7280' },
                      { type: 'Lands', count: 24, color: '#f59e0b' },
                    ].map((item) => (
                      <div key={item.type} className="type-row">
                        <div className="type-info">
                          <span
                            className="type-dot"
                            style={{ background: item.color }}
                          />
                          <span className="type-name">{item.type}</span>
                        </div>
                        <span className="type-count">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Color Distribution */}
                <div className="analysis-card">
                  <h4>🎨 Color Distribution</h4>
                  <div className="color-bars">
                    {[
                      { color: 'W', name: 'White', count: 8, bg: '#f9fafb', text: '#374151' },
                      { color: 'U', name: 'Blue', count: 4, bg: '#3b82f6', text: '#fff' },
                      { color: 'B', name: 'Black', count: 2, bg: '#1f2937', text: '#fff' },
                      { color: 'R', name: 'Red', count: 10, bg: '#ef4444', text: '#fff' },
                      { color: 'G', name: 'Green', count: 12, bg: '#22c55e', text: '#fff' },
                    ].map((item) => (
                      <div key={item.color} className="color-row">
                        <span
                          className="color-pip-small"
                          style={{ background: item.bg, color: item.text }}
                        >
                          {item.color}
                        </span>
                        <div className="color-bar-bg">
                          <div
                            className="color-bar-fill"
                            style={{
                              width: `${(item.count / 12) * 100}%`,
                              background: item.bg
                            }}
                          />
                        </div>
                        <span className="color-count">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* General Recommendations */}
                <div className="analysis-card recommendations-card">
                  <h4>💡 Recommendations</h4>
                  <ul className="recommendations-list">
                    <li className="rec-success">
                      <span className="rec-icon">✓</span>
                      Land count (24) is within the recommended 22-26 range for Standard.
                    </li>
                    <li className="rec-success">
                      <span className="rec-icon">✓</span>
                      Good mana curve with focus on 1-3 CMC spells.
                    </li>
                    <li className="rec-warning">
                      <span className="rec-icon">⚠</span>
                      Consider adding more card draw for consistency.
                    </li>
                    <li className="rec-info">
                      <span className="rec-icon">ℹ</span>
                      Two-color deck detected. Mana base looks stable.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
