import { useState, useMemo, useCallback } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useDeck } from '../../contexts/DeckContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  getQuickVerdict,
  getFullAnalysis,
  isAIAvailable,
  type QuickVerdictResult,
  type FullAnalysisResult,
} from '../../services/deckAnalysis'
import './DeckAnalysis.css'

// Color codes for display
const COLOR_INFO: Record<string, { name: string; bg: string; text: string }> = {
  W: { name: 'White', bg: '#f9fafb', text: '#374151' },
  U: { name: 'Blue', bg: '#3b82f6', text: '#fff' },
  B: { name: 'Black', bg: '#1f2937', text: '#fff' },
  R: { name: 'Red', bg: '#ef4444', text: '#fff' },
  G: { name: 'Green', bg: '#22c55e', text: '#fff' },
  C: { name: 'Colorless', bg: '#6b7280', text: '#fff' },
}

// Type colors for chart
const TYPE_COLORS: Record<string, string> = {
  Creature: '#22c55e',
  Instant: '#3b82f6',
  Sorcery: '#ef4444',
  Enchantment: '#a855f7',
  Artifact: '#6b7280',
  Land: '#f59e0b',
  Planeswalker: '#ec4899',
  Battle: '#14b8a6',
}

// Format-specific recommendations
function getFormatRecommendations(
  format: string,
  stats: {
    totalCards: number
    landCount: number
    averageCMC: number
    colorDistribution: Record<string, number>
    creatureCount: number
    nonlandCount: number
  }
) {
  const recommendations: Array<{ type: 'success' | 'warning' | 'info' | 'error'; text: string }> = []

  const isCommander = format === 'commander'
  const targetCards = isCommander ? 100 : 60
  const minLands = isCommander ? 35 : 22
  const maxLands = isCommander ? 40 : 26

  // Card count check
  if (stats.totalCards === targetCards) {
    recommendations.push({
      type: 'success',
      text: `Deck has exactly ${targetCards} cards - perfect for ${format}!`,
    })
  } else if (stats.totalCards < targetCards) {
    recommendations.push({
      type: 'error',
      text: `Deck has ${stats.totalCards} cards. ${format.charAt(0).toUpperCase() + format.slice(1)} requires ${targetCards} cards.`,
    })
  } else {
    recommendations.push({
      type: 'warning',
      text: `Deck has ${stats.totalCards} cards. Consider trimming to ${targetCards} for ${format}.`,
    })
  }

  // Land count check
  if (stats.landCount >= minLands && stats.landCount <= maxLands) {
    recommendations.push({
      type: 'success',
      text: `Land count (${stats.landCount}) is within the recommended ${minLands}-${maxLands} range.`,
    })
  } else if (stats.landCount < minLands) {
    recommendations.push({
      type: 'warning',
      text: `Consider adding more lands. Current: ${stats.landCount}, Recommended: ${minLands}-${maxLands}.`,
    })
  } else {
    recommendations.push({
      type: 'info',
      text: `High land count (${stats.landCount}). Consider cutting some for more spells.`,
    })
  }

  // Mana curve check
  if (stats.averageCMC <= 2.5) {
    recommendations.push({
      type: 'success',
      text: 'Low average mana cost - deck should be fast and aggressive.',
    })
  } else if (stats.averageCMC <= 3.5) {
    recommendations.push({
      type: 'success',
      text: 'Balanced mana curve for a midrange strategy.',
    })
  } else {
    recommendations.push({
      type: 'warning',
      text: `High average CMC (${stats.averageCMC}). Consider adding more early game plays.`,
    })
  }

  // Color count check
  const activeColors = Object.entries(stats.colorDistribution)
    .filter(([color, count]) => color !== 'C' && count > 0)
    .length

  if (activeColors === 1) {
    recommendations.push({
      type: 'success',
      text: 'Mono-colored deck - mana base should be very consistent.',
    })
  } else if (activeColors === 2) {
    recommendations.push({
      type: 'info',
      text: 'Two-color deck - ensure you have good color fixing.',
    })
  } else if (activeColors >= 3) {
    recommendations.push({
      type: 'warning',
      text: `${activeColors}-color deck detected. Prioritize mana fixing and dual lands.`,
    })
  }

  // Creature count check
  const creatureRatio = stats.creatureCount / Math.max(stats.nonlandCount, 1)
  if (creatureRatio < 0.3) {
    recommendations.push({
      type: 'info',
      text: 'Low creature count - this appears to be a spell-focused or control deck.',
    })
  } else if (creatureRatio > 0.7) {
    recommendations.push({
      type: 'info',
      text: 'High creature density - consider adding protection or combat tricks.',
    })
  }

  return recommendations
}

// Power level bar component
function PowerLevelBar({ level }: { level: number }) {
  const getColor = (l: number) => {
    if (l <= 3) return '#ef4444'
    if (l <= 5) return '#f59e0b'
    if (l <= 7) return '#22c55e'
    if (l <= 9) return '#3b82f6'
    return '#8b5cf6'
  }

  const getLabel = (l: number) => {
    if (l <= 3) return 'Casual'
    if (l <= 5) return 'FNM Competitive'
    if (l <= 7) return 'Local Tournament'
    if (l <= 9) return 'Highly Competitive'
    return 'Top Tier'
  }

  return (
    <div className="power-level-bar">
      <div className="power-level-header">
        <span className="power-level-label">Power Level</span>
        <span className="power-level-value" style={{ color: getColor(level) }}>
          {level}/10
        </span>
      </div>
      <div className="power-level-track">
        <div
          className="power-level-fill"
          style={{
            width: `${level * 10}%`,
            background: `linear-gradient(90deg, ${getColor(level)}80, ${getColor(level)})`,
          }}
        />
      </div>
      <span className="power-level-description">{getLabel(level)}</span>
    </div>
  )
}

export default function DeckAnalysis() {
  const { currentDeck, currentDeckStats } = useDeck()
  const { user, useCredits } = useAuth()

  const [showFreeAnalysis, setShowFreeAnalysis] = useState(true)
  const [quickVerdictLoading, setQuickVerdictLoading] = useState(false)
  const [fullAnalysisLoading, setFullAnalysisLoading] = useState(false)
  const [quickVerdictResult, setQuickVerdictResult] = useState<QuickVerdictResult | null>(null)
  const [fullAnalysisResult, setFullAnalysisResult] = useState<FullAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // If no deck is loaded, redirect back to deck builder
  if (!currentDeck || !currentDeckStats) {
    return <Navigate to="/deck-builder" replace />
  }

  const {
    name: deckName,
    format,
    cards,
    commander
  } = currentDeck

  const {
    totalCards,
    uniqueCards,
    averageCMC,
    totalPrice,
    colorDistribution,
    typeDistribution,
    manaCurve,
    landCount,
    nonlandCount,
    creatureCount,
  } = currentDeckStats

  const creditBalance = user?.credits ?? 0
  const landPercentage = totalCards > 0 ? ((landCount / totalCards) * 100).toFixed(1) : '0'

  // Get active colors for the color pips display
  const activeColors = useMemo(() => {
    const colors = new Set<string>()
    cards.forEach(card => {
      card.colors.forEach(c => colors.add(c))
    })
    if (commander) {
      commander.colors.forEach(c => colors.add(c))
    }
    return colors
  }, [cards, commander])

  // Format the mana curve data for display
  const manaCurveData = useMemo(() => {
    const maxCount = Math.max(...Object.values(manaCurve), 1)
    return [
      { cmc: 0, count: manaCurve[0] || 0, label: '0', max: maxCount },
      { cmc: 1, count: manaCurve[1] || 0, label: '1', max: maxCount },
      { cmc: 2, count: manaCurve[2] || 0, label: '2', max: maxCount },
      { cmc: 3, count: manaCurve[3] || 0, label: '3', max: maxCount },
      { cmc: 4, count: manaCurve[4] || 0, label: '4', max: maxCount },
      { cmc: 5, count: manaCurve[5] || 0, label: '5', max: maxCount },
      { cmc: 6, count: (manaCurve[6] || 0) + (manaCurve[7] || 0), label: '6+', max: maxCount },
    ]
  }, [manaCurve])

  // Format type distribution for display
  const typeDistributionData = useMemo(() => {
    const types = Object.entries(typeDistribution)
      .map(([type, count]) => ({
        type,
        count,
        color: TYPE_COLORS[type] || '#6b7280',
      }))
      .sort((a, b) => b.count - a.count)

    // Add lands count if not already present
    if (!types.find(t => t.type === 'Land')) {
      types.push({ type: 'Land', count: landCount, color: TYPE_COLORS.Land })
    }

    return types.filter(t => t.count > 0)
  }, [typeDistribution, landCount])

  // Format color distribution for display
  const colorDistributionData = useMemo(() => {
    const maxCount = Math.max(...Object.values(colorDistribution), 1)
    return Object.entries(colorDistribution)
      .filter(([, count]) => count > 0)
      .map(([color, count]) => ({
        color,
        ...COLOR_INFO[color],
        count,
        max: maxCount,
      }))
      .sort((a, b) => b.count - a.count)
  }, [colorDistribution])

  // Get recommendations based on deck stats
  const recommendations = useMemo(() => {
    return getFormatRecommendations(format, {
      totalCards,
      landCount,
      averageCMC,
      colorDistribution,
      creatureCount,
      nonlandCount,
    })
  }, [format, totalCards, landCount, averageCMC, colorDistribution, creatureCount, nonlandCount])

  const handleQuickVerdict = useCallback(async () => {
    if (!isAIAvailable()) {
      setAnalysisError('AI service not configured. Please add your Google API key.')
      return
    }

    if (creditBalance < 1) {
      setAnalysisError('Not enough credits. You need at least 1 credit for Quick Verdict.')
      return
    }

    setQuickVerdictLoading(true)
    setAnalysisError(null)

    try {
      const result = await getQuickVerdict(
        deckName,
        format,
        cards,
        commander,
        currentDeckStats
      )
      setQuickVerdictResult(result)
      setFullAnalysisResult(null) // Clear full analysis if showing quick
      await useCredits(1) // Deduct credit
    } catch (error) {
      console.error('Quick verdict error:', error)
      setAnalysisError(error instanceof Error ? error.message : 'Failed to get AI analysis. Please try again.')
    } finally {
      setQuickVerdictLoading(false)
    }
  }, [deckName, format, cards, commander, currentDeckStats, creditBalance, useCredits])

  const handleFullAnalysis = useCallback(async () => {
    if (!isAIAvailable()) {
      setAnalysisError('AI service not configured. Please add your Google API key.')
      return
    }

    if (creditBalance < 3) {
      setAnalysisError('Not enough credits. You need at least 3 credits for Full Analysis.')
      return
    }

    setFullAnalysisLoading(true)
    setAnalysisError(null)

    try {
      const result = await getFullAnalysis(
        deckName,
        format,
        cards,
        commander,
        currentDeckStats
      )
      setFullAnalysisResult(result)
      setQuickVerdictResult(null) // Clear quick verdict if showing full
      await useCredits(3) // Deduct credits
    } catch (error) {
      console.error('Full analysis error:', error)
      setAnalysisError(error instanceof Error ? error.message : 'Failed to get AI analysis. Please try again.')
    } finally {
      setFullAnalysisLoading(false)
    }
  }, [deckName, format, cards, commander, currentDeckStats, creditBalance, useCredits])

  const formatDisplayName = format.charAt(0).toUpperCase() + format.slice(1)

  // Get current analysis result (quick or full)
  const currentAnalysis = fullAnalysisResult || quickVerdictResult

  return (
    <div className="deck-analysis-page">
      {/* Header */}
      <div className="analysis-header">
        <div className="header-left">
          <Link to="/deck-builder" className="back-link">
            ← Back to Builder
          </Link>
          <h1>{deckName || 'Untitled Deck'}</h1>
          <span className="deck-meta">
            {totalCards} cards • {formatDisplayName}
            {commander && ` • Commander: ${commander.name}`}
          </span>
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
            <h3>Deck Overview</h3>
            <div className="overview-stats">
              <div className="stat-row">
                <span>Total Cards</span>
                <span className="stat-value">{totalCards}</span>
              </div>
              <div className="stat-row">
                <span>Unique Cards</span>
                <span className="stat-value">{uniqueCards}</span>
              </div>
              <div className="stat-row">
                <span>Lands</span>
                <span className="stat-value">{landCount} ({landPercentage}%)</span>
              </div>
              <div className="stat-row">
                <span>Non-lands</span>
                <span className="stat-value">{nonlandCount}</span>
              </div>
              <div className="stat-row">
                <span>Creatures</span>
                <span className="stat-value">{creatureCount}</span>
              </div>
              <div className="stat-row">
                <span>Avg. Mana Cost</span>
                <span className="stat-value">{averageCMC}</span>
              </div>
              <div className="stat-row">
                <span>Est. Price</span>
                <span className="stat-value">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <h3>Colors</h3>
            <div className="color-pips">
              <span className={`pip pip-white ${activeColors.has('W') ? 'active' : ''}`} title="White">W</span>
              <span className={`pip pip-blue ${activeColors.has('U') ? 'active' : ''}`} title="Blue">U</span>
              <span className={`pip pip-black ${activeColors.has('B') ? 'active' : ''}`} title="Black">B</span>
              <span className={`pip pip-red ${activeColors.has('R') ? 'active' : ''}`} title="Red">R</span>
              <span className={`pip pip-green ${activeColors.has('G') ? 'active' : ''}`} title="Green">G</span>
            </div>
          </div>

          {commander && (
            <div className="summary-card commander-card">
              <h3>Commander</h3>
              <div className="commander-info">
                <span className="commander-name">{commander.name}</span>
                <span className="commander-cost">{commander.manaCost}</span>
              </div>
            </div>
          )}

          <Link to="/deck-builder" className="edit-deck-btn">
            Edit Deck
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
                disabled={quickVerdictLoading || fullAnalysisLoading || creditBalance < 1}
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
                disabled={fullAnalysisLoading || quickVerdictLoading || creditBalance < 3}
              >
                <span className="btn-icon">🧠</span>
                <span className="btn-text">
                  {fullAnalysisLoading ? 'Deep Analysis...' : 'Full Analysis'}
                </span>
                <span className="btn-cost">3 ⚡</span>
              </button>
            </div>

            {analysisError && (
              <div className="analysis-error">
                <span className="error-icon">⚠️</span>
                {analysisError}
              </div>
            )}

            {!currentAnalysis && !analysisError && (
              <p className="ai-description">
                Get AI-powered insights including archetype detection, power level rating,
                strengths, weaknesses, and personalized card suggestions.
              </p>
            )}

            {/* AI Analysis Results */}
            {currentAnalysis && (
              <div className="ai-results">
                <div className="ai-verdict-header">
                  <div className="archetype-badge">{currentAnalysis.archetype}</div>
                  <PowerLevelBar level={currentAnalysis.powerLevel} />
                </div>

                <div className="verdict-text">
                  <p>{currentAnalysis.verdict}</p>
                </div>

                <div className="strengths-weaknesses">
                  <div className="sw-column strengths">
                    <h4>Strengths</h4>
                    <ul>
                      {currentAnalysis.topStrengths.map((s, i) => (
                        <li key={i}><span className="sw-icon">+</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="sw-column weaknesses">
                    <h4>Weaknesses</h4>
                    <ul>
                      {currentAnalysis.topWeaknesses.map((w, i) => (
                        <li key={i}><span className="sw-icon">-</span>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Full Analysis Additional Content */}
                {fullAnalysisResult && (
                  <>
                    <div className="analysis-divider" />

                    <div className="win-conditions">
                      <h4>Win Conditions</h4>
                      <ul>
                        {fullAnalysisResult.winConditions.map((wc, i) => (
                          <li key={i}>{wc}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="card-suggestions">
                      <div className="suggestions-column cuts">
                        <h4>Suggested Cuts</h4>
                        {fullAnalysisResult.suggestedCuts.length > 0 ? (
                          <ul>
                            {fullAnalysisResult.suggestedCuts.map((cut, i) => (
                              <li key={i}>
                                <span className="card-name">{cut.card}</span>
                                <span className="card-reason">{cut.reason}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="no-suggestions">No cuts suggested</p>
                        )}
                      </div>
                      <div className="suggestions-column additions">
                        <h4>Suggested Additions</h4>
                        {fullAnalysisResult.suggestedAdditions.length > 0 ? (
                          <ul>
                            {fullAnalysisResult.suggestedAdditions.map((add, i) => (
                              <li key={i}>
                                <span className="card-name">{add.card}</span>
                                <span className="card-reason">{add.reason}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="no-suggestions">No additions suggested</p>
                        )}
                      </div>
                    </div>

                    <div className="matchup-analysis">
                      <h4>Matchup Analysis</h4>
                      <div className="matchups">
                        <div className="matchup-column good">
                          <span className="matchup-label">Good Against</span>
                          <ul>
                            {fullAnalysisResult.matchupAnalysis.goodAgainst.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="matchup-column bad">
                          <span className="matchup-label">Struggles Against</span>
                          <ul>
                            {fullAnalysisResult.matchupAnalysis.badAgainst.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {fullAnalysisResult.sideboardTips && fullAnalysisResult.sideboardTips.length > 0 && (
                      <div className="sideboard-tips">
                        <h4>Sideboard Tips</h4>
                        <ul>
                          {fullAnalysisResult.sideboardTips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="overall-strategy">
                      <h4>Overall Strategy</h4>
                      <p>{fullAnalysisResult.overallStrategy}</p>
                    </div>
                  </>
                )}

                {quickVerdictResult && !fullAnalysisResult && (
                  <div className="upgrade-prompt">
                    <p>Want more detailed analysis?</p>
                    <button
                      className="upgrade-btn"
                      onClick={handleFullAnalysis}
                      disabled={fullAnalysisLoading || creditBalance < 3}
                    >
                      Get Full Analysis (3 ⚡)
                    </button>
                  </div>
                )}
              </div>
            )}
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
                  <h4>Mana Curve</h4>
                  <div className="mana-curve-horizontal">
                    {manaCurveData.map((item) => (
                      <div key={item.cmc} className="curve-row">
                        <span className="curve-label">{item.label}</span>
                        <div className="curve-bar-container">
                          <div
                            className="curve-bar-fill"
                            style={{ width: `${(item.count / item.max) * 100}%` }}
                          />
                        </div>
                        <span className="curve-count">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Type Distribution */}
                <div className="analysis-card">
                  <h4>Card Types</h4>
                  <div className="type-distribution">
                    {typeDistributionData.map((item) => (
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
                {colorDistributionData.length > 0 && (
                  <div className="analysis-card">
                    <h4>Color Distribution</h4>
                    <div className="color-bars">
                      {colorDistributionData.map((item) => (
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
                                width: `${(item.count / item.max) * 100}%`,
                                background: item.bg
                              }}
                            />
                          </div>
                          <span className="color-count">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Recommendations */}
                <div className="analysis-card recommendations-card">
                  <h4>Recommendations</h4>
                  <ul className="recommendations-list">
                    {recommendations.map((rec, index) => (
                      <li key={index} className={`rec-${rec.type}`}>
                        <span className="rec-icon">
                          {rec.type === 'success' && '✓'}
                          {rec.type === 'warning' && '⚠'}
                          {rec.type === 'info' && 'ℹ'}
                          {rec.type === 'error' && '✗'}
                        </span>
                        {rec.text}
                      </li>
                    ))}
                  </ul>

                  {/* Teaser for AI analysis */}
                  {!currentAnalysis && (
                    <div className="ai-teaser">
                      <div className="teaser-header">
                        <span className="teaser-icon">🔮</span>
                        <span className="teaser-title">Want deeper insights?</span>
                      </div>
                      <ul className="teaser-list">
                        <li>Archetype detection & power level rating</li>
                        <li>Specific card suggestions for your strategy</li>
                        <li>Win condition analysis</li>
                        <li>Matchup predictions & sideboard tips</li>
                      </ul>
                      <p className="teaser-cta">
                        Try <strong>Quick Verdict</strong> for 1 credit or <strong>Full Analysis</strong> for complete insights!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
