import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import SearchPanel from '../../components/SearchPanel/SearchPanel'
import DeckView from '../../components/DeckView/DeckView'
import StatsPanel from '../../components/StatsPanel/StatsPanel'
import { scryfallToDeckCard, isLegendaryCreature } from '../../types/card'
import type { ScryfallCard, DeckCard } from '../../types/card'
import {
  FORMAT_RULES,
  DECK_ARCHETYPES,
  generateDeckPrompt,
  parseAIDeckResponse,
  fetchCardByName,
  type DeckArchetype,
  type DeckGenerationRequest,
} from '../../services/deckGenerator'
import './DeckBuilder.css'

// Format options
const DECK_FORMATS = [
  { value: 'standard', displayName: 'Standard' },
  { value: 'modern', displayName: 'Modern' },
  { value: 'legacy', displayName: 'Legacy' },
  { value: 'vintage', displayName: 'Vintage' },
  { value: 'commander', displayName: 'Commander' },
  { value: 'pioneer', displayName: 'Pioneer' },
  { value: 'pauper', displayName: 'Pauper' },
]

export default function DeckBuilder() {
  const [selectedFormat, setSelectedFormat] = useState('standard')
  const [deckName, setDeckName] = useState('Untitled Deck')
  const [deckCards, setDeckCards] = useState<Map<string, DeckCard>>(new Map())
  const [commander, setCommander] = useState<DeckCard | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<string>('')
  const [generationError, setGenerationError] = useState<string | null>(null)

  // AI Generation options
  const [selectedArchetype, setSelectedArchetype] = useState<DeckArchetype>('Midrange')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedBudget, setSelectedBudget] = useState<'budget' | 'moderate' | 'competitive'>('moderate')
  const [strategyNotes, setStrategyNotes] = useState('')

  const isCommanderFormat = selectedFormat === 'commander'

  // Add card to deck
  const handleAddCard = useCallback((card: ScryfallCard) => {
    setDeckCards((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(card.name)

      if (existing) {
        // Increase quantity
        newMap.set(card.name, { ...existing, quantity: existing.quantity + 1 })
      } else {
        // Add new card
        newMap.set(card.name, scryfallToDeckCard(card, 1))
      }

      return newMap
    })
  }, [])

  // Remove card from deck (decrease quantity or remove entirely)
  const handleRemoveCard = useCallback((cardName: string) => {
    setDeckCards((prev) => {
      const newMap = new Map(prev)
      newMap.delete(cardName)
      return newMap
    })
  }, [])

  // Update card quantity
  const handleQuantityChange = useCallback((cardName: string, newQuantity: number) => {
    setDeckCards((prev) => {
      const newMap = new Map(prev)
      const card = newMap.get(cardName)

      if (card) {
        if (newQuantity <= 0) {
          newMap.delete(cardName)
        } else {
          newMap.set(cardName, { ...card, quantity: newQuantity })
        }
      }

      return newMap
    })
  }, [])

  // Set commander
  const handleSetCommander = useCallback((card: ScryfallCard) => {
    const deckCard = scryfallToDeckCard(card, 1)
    setCommander(deckCard)
    // Remove from main deck if present
    setDeckCards((prev) => {
      const newMap = new Map(prev)
      newMap.delete(card.name)
      return newMap
    })
  }, [])

  // Remove commander
  const handleRemoveCommander = useCallback(() => {
    setCommander(null)
  }, [])

  // Handle card drop
  const handleCardDrop = useCallback((card: ScryfallCard) => {
    handleAddCard(card)
  }, [handleAddCard])

  // Calculate deck stats
  const deckStats = useMemo(() => {
    let totalCards = 0
    let totalCMC = 0
    let totalPrice = 0
    const colorDistribution: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
    const typeDistribution: Record<string, number> = {}
    const manaCurve: Record<number, number> = {}
    let landCount = 0
    let creatureCount = 0

    deckCards.forEach((card) => {
      totalCards += card.quantity
      totalCMC += card.cmc * card.quantity
      totalPrice += card.price * card.quantity

      // Color distribution
      if (card.colors.length === 0) {
        colorDistribution['C'] += card.quantity
      } else {
        card.colors.forEach((color) => {
          colorDistribution[color] = (colorDistribution[color] || 0) + card.quantity
        })
      }

      // Type distribution
      typeDistribution[card.cardType] = (typeDistribution[card.cardType] || 0) + card.quantity

      // Mana curve (cap at 7+)
      const cmc = Math.min(card.cmc, 7)
      manaCurve[cmc] = (manaCurve[cmc] || 0) + card.quantity

      // Counts
      if (card.cardType === 'land') landCount += card.quantity
      if (card.cardType === 'creature') creatureCount += card.quantity
    })

    // Add commander to counts if present
    if (commander && isCommanderFormat) {
      totalCards += 1
    }

    const nonlandCount = totalCards - landCount
    const averageCMC = nonlandCount > 0 ? totalCMC / nonlandCount : 0

    return {
      totalCards,
      uniqueCards: deckCards.size,
      averageCMC,
      totalPrice,
      colorDistribution,
      typeDistribution,
      manaCurve,
      landCount,
      nonlandCount,
      creatureCount,
    }
  }, [deckCards, commander, isCommanderFormat])

  // Clear deck
  const handleClear = useCallback(() => {
    if (confirm('Clear all cards from deck?')) {
      setDeckCards(new Map())
      setCommander(null)
    }
  }, [])

  const handleSave = () => {
    setIsSaving(true)
    // TODO: Implement save to Firebase
    setTimeout(() => setIsSaving(false), 1000)
  }

  const handleExport = () => {
    // Generate decklist text
    const lines: string[] = []

    if (commander && isCommanderFormat) {
      lines.push('Commander')
      lines.push(`1 ${commander.name}`)
      lines.push('')
    }

    // Group by type
    const grouped: Record<string, DeckCard[]> = {}
    deckCards.forEach((card) => {
      if (!grouped[card.cardType]) grouped[card.cardType] = []
      grouped[card.cardType].push(card)
    })

    const typeOrder = ['creature', 'instant', 'sorcery', 'enchantment', 'artifact', 'planeswalker', 'land', 'other']
    typeOrder.forEach((type) => {
      if (grouped[type]) {
        grouped[type].sort((a, b) => a.name.localeCompare(b.name))
        grouped[type].forEach((card) => {
          lines.push(`${card.quantity} ${card.name}`)
        })
        lines.push('')
      }
    })

    const decklistText = lines.join('\n').trim()

    // Download as file
    const blob = new Blob([decklistText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${deckName.replace(/[^a-z0-9]/gi, '_')}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleLoad = () => {
    // TODO: Implement load from Firebase
    console.log('Load clicked')
  }

  const handleOpenGenerateModal = () => {
    setShowGenerateModal(true)
    setGenerationError(null)
    setGenerationProgress('')
  }

  const handleCloseGenerateModal = () => {
    setShowGenerateModal(false)
    setGenerationError(null)
    setGenerationProgress('')
  }

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    )
  }

  const handleAIGenerate = async () => {
    setIsGenerating(true)
    setGenerationError(null)
    setGenerationProgress('Preparing deck generation...')

    try {
      const request: DeckGenerationRequest = {
        format: selectedFormat,
        archetype: selectedArchetype,
        colors: selectedColors.length > 0 ? selectedColors : undefined,
        commander: commander?.name,
        strategy: strategyNotes || undefined,
        budget: selectedBudget,
      }

      // Generate the prompt
      const prompt = generateDeckPrompt(request)
      console.log('AI Prompt:', prompt)

      setGenerationProgress('Generating deck list...')

      // For now, use a sample deck generation based on format/archetype
      // In production, this would call Claude API or similar
      const sampleDeck = generateSampleDeck(selectedFormat, selectedArchetype, selectedColors)

      setGenerationProgress('Fetching card data from Scryfall...')

      // Clear current deck if generating new
      const newDeckCards = new Map<string, DeckCard>()
      let processedCount = 0
      const totalCards = sampleDeck.length

      for (const { quantity, name } of sampleDeck) {
        setGenerationProgress(`Fetching card ${++processedCount}/${totalCards}: ${name}`)

        const card = await fetchCardByName(name)
        if (card) {
          // Check if this is the commander (quantity = -1 is our signal)
          if (quantity === -1) {
            const deckCard = scryfallToDeckCard(card, 1)
            setCommander(deckCard)
          } else {
            newDeckCards.set(card.name, scryfallToDeckCard(card, quantity))
          }
        } else {
          console.warn(`Could not find card: ${name}`)
        }

        // Small delay to avoid rate limiting Scryfall
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      setDeckCards(newDeckCards)
      setGenerationProgress('Deck generated successfully!')
      setShowGenerateModal(false)

      // Auto-name the deck based on archetype and colors
      const colorNames: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' }
      const colorPart = selectedColors.map((c) => colorNames[c]).join('/') || 'Colorless'
      setDeckName(`${colorPart} ${selectedArchetype}`)
    } catch (err) {
      console.error('Deck generation failed:', err)
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate deck')
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate a sample deck based on format and archetype
  function generateSampleDeck(
    format: string,
    archetype: DeckArchetype,
    colors: string[]
  ): Array<{ quantity: number; name: string }> {
    const rules = FORMAT_RULES[format] || FORMAT_RULES.standard
    const deck: Array<{ quantity: number; name: string }> = []

    // Determine primary and secondary colors
    const primaryColor = colors[0] || 'R'
    const secondaryColor = colors[1]

    if (format === 'commander') {
      // Commander deck - 99 cards + commander (singleton)
      // Add commander first (marked with special flag)
      const commanderName = getCommanderForColors(colors, archetype)
      if (commanderName) {
        deck.push({ quantity: -1, name: commanderName }) // -1 signals this is the commander
      }
      deck.push(...getCommanderStaples())
      deck.push(...getColorStaples(primaryColor, 1))
      if (secondaryColor) {
        deck.push(...getColorStaples(secondaryColor, 1))
      }
      deck.push(...getArchetypeCards(archetype, 1))
      deck.push(...getCommanderLands(colors))
    } else {
      // 60-card formats
      deck.push(...getArchetypeCards(archetype, rules.maxCopies))
      deck.push(...getColorStaples(primaryColor, rules.maxCopies))
      if (secondaryColor) {
        deck.push(...getColorStaples(secondaryColor, rules.maxCopies))
      }
      deck.push(...getFormatLands(colors, rules.recommendedLands))
    }

    return deck
  }

  function getCommanderForColors(colors: string[], archetype: DeckArchetype): string {
    // Popular commanders organized by color identity
    const commanders: Record<string, string[]> = {
      // Mono-color
      W: ['Giada, Font of Hope', 'Heliod, Sun-Crowned', 'Adeline, Resplendent Cathar'],
      U: ['Urza, Lord High Artificer', 'Talrand, Sky Summoner', 'Baral, Chief of Compliance'],
      B: ['K\'rrik, Son of Yawgmoth', 'Erebos, God of the Dead', 'Sheoldred, the Apocalypse'],
      R: ['Krenko, Mob Boss', 'Purphoros, God of the Forge', 'Etali, Primal Storm'],
      G: ['Selvala, Heart of the Wilds', 'Ezuri, Renegade Leader', 'Yeva, Nature\'s Herald'],
      // Two-color
      WU: ['Brago, King Eternal', 'Grand Arbiter Augustin IV'],
      WB: ['Teysa Karlov', 'Kambal, Consul of Allocation'],
      WR: ['Winota, Joiner of Forces', 'Feather, the Redeemed'],
      WG: ['Trostani, Selesnya\'s Voice', 'Sigarda, Host of Herons'],
      UB: ['Yuriko, the Tiger\'s Shadow', 'Anowon, the Ruin Thief'],
      UR: ['Niv-Mizzet, Parun', 'Locust God'],
      UG: ['Kinnan, Bonder Prodigy', 'Tatyova, Benthic Druid'],
      BR: ['Rakdos, Lord of Riots', 'Judith, the Scourge Diva'],
      BG: ['Meren of Clan Nel Toth', 'The Gitrog Monster'],
      RG: ['Xenagos, God of Revels', 'Ruric Thar, the Unbowed'],
      // Three-color
      WUB: ['Raffine, Scheming Seer', 'Zur the Enchanter'],
      WUR: ['Narset, Enlightened Master', 'Kykar, Wind\'s Fury'],
      WUG: ['Chulane, Teller of Tales', 'Derevi, Empyrial Tactician'],
      WBR: ['Kaalia of the Vast', 'Queen Marchesa'],
      WBG: ['Karador, Ghost Chieftain', 'Nethroi, Apex of Death'],
      WRG: ['Marath, Will of the Wild', 'Jetmir, Nexus of Revels'],
      UBR: ['Marchesa, the Black Rose', 'Nicol Bolas, the Ravager'],
      UBG: ['Muldrotha, the Gravetide', 'Tasigur, the Golden Fang'],
      URG: ['Maelstrom Wanderer', 'Animar, Soul of Elements'],
      BRG: ['Korvold, Fae-Cursed King', 'Prossh, Skyraider of Kher'],
    }

    // Build color key
    const sortedColors = [...colors].sort().join('')
    const colorKey = sortedColors || 'R' // Default to red

    // Get commanders for this color combination
    const options = commanders[colorKey] || commanders[colors[0]] || commanders['R']

    // Return first option (could be randomized or archetype-based)
    return options[0]
  }

  function getCommanderStaples(): Array<{ quantity: number; name: string }> {
    return [
      { quantity: 1, name: 'Sol Ring' },
      { quantity: 1, name: 'Arcane Signet' },
      { quantity: 1, name: 'Command Tower' },
      { quantity: 1, name: 'Lightning Greaves' },
      { quantity: 1, name: 'Swiftfoot Boots' },
      { quantity: 1, name: 'Thought Vessel' },
      { quantity: 1, name: 'Mind Stone' },
    ]
  }

  function getColorStaples(color: string, maxCopies: number): Array<{ quantity: number; name: string }> {
    const staples: Record<string, Array<{ quantity: number; name: string }>> = {
      W: [
        { quantity: maxCopies, name: 'Swords to Plowshares' },
        { quantity: maxCopies, name: 'Path to Exile' },
        { quantity: maxCopies, name: 'Generous Gift' },
      ],
      U: [
        { quantity: maxCopies, name: 'Counterspell' },
        { quantity: maxCopies, name: 'Ponder' },
        { quantity: maxCopies, name: 'Brainstorm' },
      ],
      B: [
        { quantity: maxCopies, name: 'Fatal Push' },
        { quantity: maxCopies, name: 'Thoughtseize' },
        { quantity: maxCopies, name: 'Dark Ritual' },
      ],
      R: [
        { quantity: maxCopies, name: 'Lightning Bolt' },
        { quantity: maxCopies, name: 'Monastery Swiftspear' },
        { quantity: maxCopies, name: 'Goblin Guide' },
      ],
      G: [
        { quantity: maxCopies, name: 'Llanowar Elves' },
        { quantity: maxCopies, name: 'Birds of Paradise' },
        { quantity: maxCopies, name: 'Cultivate' },
      ],
    }
    return staples[color] || []
  }

  function getArchetypeCards(archetype: DeckArchetype, maxCopies: number): Array<{ quantity: number; name: string }> {
    const cards: Record<string, Array<{ quantity: number; name: string }>> = {
      Aggro: [
        { quantity: maxCopies, name: 'Monastery Swiftspear' },
        { quantity: maxCopies, name: 'Goblin Guide' },
        { quantity: maxCopies, name: 'Eidolon of the Great Revel' },
        { quantity: maxCopies, name: 'Lava Spike' },
      ],
      Control: [
        { quantity: maxCopies, name: 'Counterspell' },
        { quantity: maxCopies, name: 'Wrath of God' },
        { quantity: maxCopies, name: 'Fact or Fiction' },
      ],
      Midrange: [
        { quantity: maxCopies, name: 'Tarmogoyf' },
        { quantity: maxCopies, name: 'Liliana of the Veil' },
        { quantity: maxCopies, name: 'Thoughtseize' },
      ],
      Combo: [
        { quantity: maxCopies, name: 'Serum Visions' },
        { quantity: maxCopies, name: 'Sleight of Hand' },
      ],
      Tempo: [
        { quantity: maxCopies, name: 'Delver of Secrets' },
        { quantity: maxCopies, name: 'Spell Pierce' },
      ],
      Ramp: [
        { quantity: maxCopies, name: 'Llanowar Elves' },
        { quantity: maxCopies, name: 'Cultivate' },
        { quantity: maxCopies, name: 'Primeval Titan' },
      ],
      Burn: [
        { quantity: maxCopies, name: 'Lightning Bolt' },
        { quantity: maxCopies, name: 'Lava Spike' },
        { quantity: maxCopies, name: 'Rift Bolt' },
        { quantity: maxCopies, name: 'Searing Blaze' },
      ],
      Tribal: [
        { quantity: maxCopies, name: 'Aether Vial' },
      ],
      Tokens: [
        { quantity: maxCopies, name: 'Raise the Alarm' },
        { quantity: maxCopies, name: 'Intangible Virtue' },
      ],
      Aristocrats: [
        { quantity: maxCopies, name: 'Blood Artist' },
        { quantity: maxCopies, name: 'Viscera Seer' },
      ],
      Reanimator: [
        { quantity: maxCopies, name: 'Reanimate' },
        { quantity: maxCopies, name: 'Entomb' },
        { quantity: maxCopies, name: 'Griselbrand' },
      ],
      Mill: [
        { quantity: maxCopies, name: 'Hedron Crab' },
        { quantity: maxCopies, name: 'Archive Trap' },
      ],
    }
    return cards[archetype] || []
  }

  function getFormatLands(colors: string[], count: number): Array<{ quantity: number; name: string }> {
    const basicLands: Record<string, string> = {
      W: 'Plains',
      U: 'Island',
      B: 'Swamp',
      R: 'Mountain',
      G: 'Forest',
    }

    if (colors.length === 0) {
      return [{ quantity: count, name: 'Mountain' }]
    }

    if (colors.length === 1) {
      return [{ quantity: count, name: basicLands[colors[0]] || 'Mountain' }]
    }

    // Two-color mana base
    const lands: Array<{ quantity: number; name: string }> = []
    const basicCount = Math.floor(count * 0.6)
    const dualCount = count - basicCount

    lands.push({ quantity: Math.ceil(basicCount / 2), name: basicLands[colors[0]] || 'Mountain' })
    lands.push({ quantity: Math.floor(basicCount / 2), name: basicLands[colors[1]] || 'Forest' })

    // Add some dual lands based on colors
    const dualLandNames = getDualLandName(colors[0], colors[1])
    if (dualLandNames.length > 0) {
      const perLand = Math.ceil(dualCount / dualLandNames.length)
      dualLandNames.forEach((land) => {
        lands.push({ quantity: Math.min(perLand, 4), name: land })
      })
    }

    return lands
  }

  function getDualLandName(color1: string, color2: string): string[] {
    const duals: Record<string, string[]> = {
      WU: ['Hallowed Fountain', 'Glacial Fortress'],
      WB: ['Godless Shrine', 'Isolated Chapel'],
      WR: ['Sacred Foundry', 'Clifftop Retreat'],
      WG: ['Temple Garden', 'Sunpetal Grove'],
      UB: ['Watery Grave', 'Drowned Catacomb'],
      UR: ['Steam Vents', 'Sulfur Falls'],
      UG: ['Breeding Pool', 'Hinterland Harbor'],
      BR: ['Blood Crypt', 'Dragonskull Summit'],
      BG: ['Overgrown Tomb', 'Woodland Cemetery'],
      RG: ['Stomping Ground', 'Rootbound Crag'],
    }
    const key1 = color1 + color2
    const key2 = color2 + color1
    return duals[key1] || duals[key2] || []
  }

  function getCommanderLands(colors: string[]): Array<{ quantity: number; name: string }> {
    const lands: Array<{ quantity: number; name: string }> = [
      { quantity: 1, name: 'Command Tower' },
    ]

    const basicLands: Record<string, string> = {
      W: 'Plains',
      U: 'Island',
      B: 'Swamp',
      R: 'Mountain',
      G: 'Forest',
    }

    // Add basic lands
    const basicsPerColor = Math.floor(30 / Math.max(colors.length, 1))
    colors.forEach((color) => {
      lands.push({ quantity: basicsPerColor, name: basicLands[color] || 'Wastes' })
    })

    // Add some utility lands
    lands.push({ quantity: 1, name: 'Reliquary Tower' })
    lands.push({ quantity: 1, name: 'Exotic Orchard' })

    return lands
  }

  return (
    <div className="deck-builder">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="left-controls">
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="format-select"
          >
            {DECK_FORMATS.map((format) => (
              <option key={format.value} value={format.value}>
                {format.displayName}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Untitled Deck"
            className="deck-name-input"
          />

          <button
            className="btn btn-ai"
            onClick={handleOpenGenerateModal}
            disabled={isGenerating}
            title="Generate AI deck"
          >
            {isGenerating ? '⏳ Generating...' : '🧠 AI Generate'}
          </button>

          <button
            className="btn btn-danger"
            onClick={handleClear}
            title="Clear deck"
          >
            🗑️ Clear
          </button>
        </div>

        <div className="right-actions">
          <button className="btn btn-secondary" onClick={handleLoad}>
            📂 Load
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            📥 Export
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '💾 Saving...' : '💾 Save'}
          </button>
          <Link to="/analysis" className="btn btn-analyze">
            📊 Analyze
          </Link>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="builder-layout">
        {/* Left: Search Panel */}
        <div className="search-column">
          <SearchPanel
            selectedFormat={selectedFormat}
            isCommanderFormat={isCommanderFormat}
            onCardAdd={handleAddCard}
            onCommanderSet={isCommanderFormat ? handleSetCommander : undefined}
          />
        </div>

        {/* Center: Deck View */}
        <div className="deck-column">
          <DeckView
            deckCards={deckCards}
            commander={commander}
            isCommanderFormat={isCommanderFormat}
            onRemoveCard={handleRemoveCard}
            onQuantityChange={handleQuantityChange}
            onRemoveCommander={handleRemoveCommander}
            onCardDrop={handleCardDrop}
            onCommanderDrop={isCommanderFormat ? handleSetCommander : undefined}
          />
        </div>

        {/* Right: Stats Panel */}
        <div className="stats-column">
          <StatsPanel stats={deckStats} />
        </div>
      </div>

      {/* AI Generation Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={handleCloseGenerateModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🧠 AI Deck Generator</h2>
              <button className="modal-close" onClick={handleCloseGenerateModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Format Info */}
              <div className="form-section">
                <label>Format</label>
                <div className="format-info">
                  <strong>{FORMAT_RULES[selectedFormat]?.name || selectedFormat}</strong>
                  <span className="format-desc">
                    {FORMAT_RULES[selectedFormat]?.minDeckSize} cards
                    {FORMAT_RULES[selectedFormat]?.hasCommander && ' + Commander'}
                  </span>
                </div>
              </div>

              {/* Archetype Selection */}
              <div className="form-section">
                <label>Deck Archetype</label>
                <div className="archetype-grid">
                  {DECK_ARCHETYPES.map((arch) => (
                    <button
                      key={arch}
                      className={`archetype-btn ${selectedArchetype === arch ? 'active' : ''}`}
                      onClick={() => setSelectedArchetype(arch)}
                    >
                      {arch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div className="form-section">
                <label>Colors (select up to 3)</label>
                <div className="color-picker">
                  {[
                    { code: 'W', name: 'White', symbol: '⚪' },
                    { code: 'U', name: 'Blue', symbol: '🔵' },
                    { code: 'B', name: 'Black', symbol: '⚫' },
                    { code: 'R', name: 'Red', symbol: '🔴' },
                    { code: 'G', name: 'Green', symbol: '🟢' },
                  ].map(({ code, name, symbol }) => (
                    <button
                      key={code}
                      className={`color-btn color-${code.toLowerCase()} ${selectedColors.includes(code) ? 'active' : ''}`}
                      onClick={() => toggleColor(code)}
                      disabled={!selectedColors.includes(code) && selectedColors.length >= 3}
                      title={name}
                    >
                      {symbol} {name}
                    </button>
                  ))}
                </div>
                {selectedColors.length === 0 && (
                  <small className="hint">No colors selected - will default to mono-red</small>
                )}
              </div>

              {/* Budget Selection */}
              <div className="form-section">
                <label>Budget</label>
                <div className="budget-options">
                  {[
                    { value: 'budget', label: '💰 Budget', desc: 'Under $50' },
                    { value: 'moderate', label: '💵 Moderate', desc: '$50-200' },
                    { value: 'competitive', label: '💎 Competitive', desc: 'No limit' },
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      className={`budget-btn ${selectedBudget === value ? 'active' : ''}`}
                      onClick={() => setSelectedBudget(value as 'budget' | 'moderate' | 'competitive')}
                    >
                      {label}
                      <small>{desc}</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* Strategy Notes */}
              <div className="form-section">
                <label>Strategy Notes (optional)</label>
                <textarea
                  value={strategyNotes}
                  onChange={(e) => setStrategyNotes(e.target.value)}
                  placeholder="Any specific cards or strategies you want included..."
                  rows={3}
                />
              </div>

              {/* Progress/Error Display */}
              {isGenerating && (
                <div className="generation-progress">
                  <div className="progress-spinner">⏳</div>
                  <span>{generationProgress}</span>
                </div>
              )}

              {generationError && (
                <div className="generation-error">
                  ⚠️ {generationError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseGenerateModal}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAIGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? '⏳ Generating...' : '🚀 Generate Deck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
