import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchPanel from '../../components/SearchPanel/SearchPanel'
import DeckView from '../../components/DeckView/DeckView'
import StatsPanel from '../../components/StatsPanel/StatsPanel'
import CameraScanner from '../../components/CameraScanner/CameraScanner'
import { useDeck } from '../../contexts/DeckContext'
import { scryfallToDeckCard } from '../../types/card'
import type { ScryfallCard, DeckCard } from '../../types/card'
import {
  FORMAT_RULES,
  DECK_ARCHETYPES,
  fetchCardByName,
  generateDeckWithAI,
  fetchDeckCards,
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
  const navigate = useNavigate()
  const { setDeckForAnalysis, builderState, setBuilderState, saveDeck } = useDeck()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize from context (persisted state) or defaults
  const [selectedFormat, setSelectedFormat] = useState(builderState.selectedFormat)
  const [deckName, setDeckName] = useState(builderState.deckName)
  const [deckCards, setDeckCards] = useState<Map<string, DeckCard>>(builderState.deckCards)
  const [commander, setCommander] = useState<DeckCard | null>(builderState.commander)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<string>('')
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)

  // Persist deck state to context when it changes
  useEffect(() => {
    setBuilderState({
      deckName,
      selectedFormat,
      deckCards,
      commander,
    })
  }, [deckName, selectedFormat, deckCards, commander, setBuilderState])

  // AI Generation options
  const [selectedArchetype, setSelectedArchetype] = useState<DeckArchetype>('Midrange')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedBudget, setSelectedBudget] = useState<'budget' | 'moderate' | 'competitive'>('moderate')
  const [strategyNotes, setStrategyNotes] = useState('')

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null)

  const isCommanderFormat = selectedFormat === 'commander'
  const formatRules = FORMAT_RULES[selectedFormat] || FORMAT_RULES.standard

  // Navigate to analysis with current deck data
  const handleAnalyze = useCallback(() => {
    if (deckCards.size === 0 && !commander) {
      alert('Please add some cards to your deck first!')
      return
    }
    setDeckForAnalysis(deckName, selectedFormat, deckCards, commander)
    navigate('/analysis')
  }, [deckName, selectedFormat, deckCards, commander, setDeckForAnalysis, navigate])

  // Clear validation error after a delay
  const showValidationError = useCallback((message: string) => {
    setValidationError(message)
    setTimeout(() => setValidationError(null), 4000)
  }, [])

  // Add card to deck with validation
  const handleAddCard = useCallback((card: ScryfallCard) => {
    // Check if it's a basic land (unlimited copies allowed)
    const isBasicLand = card.type_line?.toLowerCase().includes('basic') &&
                        card.type_line?.toLowerCase().includes('land')

    setDeckCards((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(card.name)

      if (existing) {
        // Check quantity limits (unless basic land)
        if (!isBasicLand) {
          if (isCommanderFormat) {
            // Commander is singleton - only 1 copy allowed
            showValidationError(`Commander format is singleton! You can only have 1 copy of "${card.name}".`)
            return prev // Don't modify
          } else if (existing.quantity >= formatRules.maxCopies) {
            // Standard/Modern etc - max 4 copies
            showValidationError(`Maximum ${formatRules.maxCopies} copies allowed in ${formatRules.name}. "${card.name}" is already at max.`)
            return prev // Don't modify
          }
        }
        // Increase quantity
        newMap.set(card.name, { ...existing, quantity: existing.quantity + 1 })
      } else {
        // Add new card
        newMap.set(card.name, scryfallToDeckCard(card, 1))
      }

      return newMap
    })
  }, [isCommanderFormat, formatRules, showValidationError])

  // Remove card from deck (decrease quantity or remove entirely)
  const handleRemoveCard = useCallback((cardName: string) => {
    setDeckCards((prev) => {
      const newMap = new Map(prev)
      newMap.delete(cardName)
      return newMap
    })
  }, [])

  // Update card quantity with validation
  const handleQuantityChange = useCallback((cardName: string, newQuantity: number) => {
    setDeckCards((prev) => {
      const newMap = new Map(prev)
      const card = newMap.get(cardName)

      if (card) {
        if (newQuantity <= 0) {
          newMap.delete(cardName)
        } else {
          // Check if it's a basic land
          const isBasicLand = card.cardType === 'land' &&
            ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'].includes(cardName)

          // Validate quantity limits (unless basic land)
          if (!isBasicLand) {
            if (isCommanderFormat && newQuantity > 1) {
              showValidationError(`Commander format is singleton! Max 1 copy of "${cardName}".`)
              return prev
            } else if (!isCommanderFormat && newQuantity > formatRules.maxCopies) {
              showValidationError(`Maximum ${formatRules.maxCopies} copies allowed in ${formatRules.name}.`)
              return prev
            }
          }

          newMap.set(cardName, { ...card, quantity: newQuantity })
        }
      }

      return newMap
    })
  }, [isCommanderFormat, formatRules, showValidationError])

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

  // Handle scanned cards from camera scanner
  const handleScannedCards = useCallback((cards: ScryfallCard[]) => {
    cards.forEach(card => handleAddCard(card))
    setShowScanner(false)
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

  const handleSave = async () => {
    if (deckCards.size === 0 && !commander) {
      alert('Please add some cards to your deck first!')
      return
    }

    setIsSaving(true)
    try {
      await saveDeck({
        name: deckName,
        format: selectedFormat,
        cards: deckCards,
        commander,
        isPublic: false,
      })
      alert('Deck saved successfully!')
    } catch (error) {
      console.error('Error saving deck:', error)
      alert(error instanceof Error ? error.message : 'Failed to save deck. Please try again.')
    } finally {
      setIsSaving(false)
    }
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
    // Trigger file input click
    fileInputRef.current?.click()
  }

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())

      // Clear current deck
      const newCards = new Map<string, DeckCard>()

      setGenerationProgress('Loading deck file...')

      for (const line of lines) {
        // Parse format: "4 Lightning Bolt" or "4x Lightning Bolt"
        const match = line.match(/^(\d+)x?\s+(.+)$/i)
        if (match) {
          const quantity = parseInt(match[1], 10)
          const cardName = match[2].trim()

          try {
            const card = await fetchCardByName(cardName)
            if (card) {
              const deckCard = scryfallToDeckCard(card, quantity)
              newCards.set(cardName, deckCard)
            }
          } catch {
            console.warn(`Could not find card: ${cardName}`)
          }
        }
      }

      setDeckCards(newCards)
      setDeckName(file.name.replace(/\.(txt|dec|dek)$/i, ''))
      setGenerationProgress('')
    } catch (err) {
      console.error('Error loading deck file:', err)
      setGenerationError('Failed to load deck file')
    }

    // Reset file input
    e.target.value = ''
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
    setGenerationProgress('Preparing AI deck generation...')

    try {
      const request: DeckGenerationRequest = {
        format: selectedFormat,
        archetype: selectedArchetype,
        colors: selectedColors.length > 0 ? selectedColors : undefined,
        commander: commander?.name,
        strategy: strategyNotes || undefined,
        budget: selectedBudget,
      }

      // Generate deck using Gemini AI
      const parsedDeck = await generateDeckWithAI(request, setGenerationProgress)

      // Fetch all cards from Scryfall
      const { mainboard, commander: aiCommander, failedCards } = await fetchDeckCards(
        parsedDeck,
        setGenerationProgress
      )

      // Build the deck map
      const newDeckCards = new Map<string, DeckCard>()

      for (const { quantity, card } of mainboard) {
        if (card) {
          newDeckCards.set(card.name, scryfallToDeckCard(card, quantity))
        }
      }

      // Set commander if AI suggested one
      if (aiCommander && isCommanderFormat) {
        setCommander(scryfallToDeckCard(aiCommander, 1))
      }

      setDeckCards(newDeckCards)

      // Show warning if some cards failed
      if (failedCards.length > 0) {
        console.warn('Failed to fetch cards:', failedCards)
        setGenerationProgress(`Deck generated! (${failedCards.length} cards not found)`)
      } else {
        setGenerationProgress('Deck generated successfully!')
      }

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

  // Generate a sample deck based on format and archetype (fallback when AI unavailable)
  // @ts-expect-error - kept as fallback, not currently used
  function _generateSampleDeck(
    format: string,
    archetype: DeckArchetype,
    colors: string[]
  ): Array<{ quantity: number; name: string }> {
    const rules = FORMAT_RULES[format] || FORMAT_RULES.standard
    const deck: Array<{ quantity: number; name: string }> = []

    // Determine colors
    const primaryColor = colors[0] || 'R'
    const secondaryColor = colors[1]
    const tertiaryColor = colors[2]

    if (format === 'commander') {
      // Commander deck - exactly 99 cards + commander = 100 total
      const TARGET_CARDS = 99
      const LAND_COUNT = rules.recommendedLands // 37 lands
      const TARGET_NONLANDS = TARGET_CARDS - LAND_COUNT // 62 non-lands

      // Track used card names to ensure singleton format
      const usedCards = new Set<string>()

      // Helper to add a card only if not already used
      const addUniqueCard = (name: string): boolean => {
        if (usedCards.has(name)) return false
        usedCards.add(name)
        deck.push({ quantity: 1, name })
        return true
      }

      // Add commander (marked with -1, not counted in 99)
      const commanderName = getCommanderForColors(colors, archetype)
      if (commanderName) {
        deck.push({ quantity: -1, name: commanderName })
        usedCards.add(commanderName) // Commander can't be in the 99
      }

      // === NON-LAND CARDS (targeting 62 cards) ===
      let nonLandCount = 0

      // Core mana rocks (8 cards)
      const staples = [
        'Sol Ring', 'Arcane Signet', 'Lightning Greaves', 'Swiftfoot Boots',
        'Thought Vessel', 'Mind Stone', 'Fellwar Stone', 'Commander\'s Sphere'
      ]
      staples.forEach(card => { if (addUniqueCard(card)) nonLandCount++ })

      // Color staples (3 per color)
      const colorStapleCards = getColorStaples(primaryColor, 1)
      if (secondaryColor) colorStapleCards.push(...getColorStaples(secondaryColor, 1))
      if (tertiaryColor) colorStapleCards.push(...getColorStaples(tertiaryColor, 1))
      colorStapleCards.forEach(c => { if (addUniqueCard(c.name)) nonLandCount++ })

      // Archetype cards
      const archetypeCards = getArchetypeCards(archetype, 1)
      archetypeCards.forEach(c => { if (addUniqueCard(c.name)) nonLandCount++ })

      // Utility package (without Commander's Sphere - already in staples)
      const utilityCards = getCommanderUtilityPackage(colors)
      utilityCards.forEach(c => { if (addUniqueCard(c.name)) nonLandCount++ })

      // Filler cards to reach 62 non-lands
      if (nonLandCount < TARGET_NONLANDS) {
        const fillerCards = getCommanderFillerCards(colors, archetype, TARGET_NONLANDS - nonLandCount)
        fillerCards.forEach(c => { if (addUniqueCard(c.name)) nonLandCount++ })
      }

      // Massive colorless card pool for emergency filling
      const colorlessCards = [
        // Mana rocks
        'Solemn Simulacrum', 'Burnished Hart', 'Darksteel Ingot', 'Worn Powerstone',
        'Thran Dynamo', 'Gilded Lotus', 'Hedron Archive', 'Everflowing Chalice',
        'Prismatic Lens', 'Guardian Idol', 'Coldsteel Heart', 'Star Compass',
        'Prophetic Prism', 'Skullclamp', 'Wayfarer\'s Bauble', 'Palladium Myr',
        'Sisay\'s Ring', 'Ur-Golem\'s Eye', 'Basalt Monolith', 'Grim Monolith',
        'Mana Vault', 'Coalition Relic', 'Chromatic Lantern', 'Armillary Sphere',
        // Creatures
        'Meteor Golem', 'Duplicant', 'Steel Hellkite', 'Wurmcoil Engine',
        'Myr Battlesphere', 'Platinum Angel', 'Platinum Emperion', 'Blightsteel Colossus',
        'Kozilek, the Great Distortion', 'Ulamog, the Ceaseless Hunger', 'Artisan of Kozilek',
        'It That Betrays', 'Void Winnower', 'Walking Ballista', 'Hangarback Walker',
        'Stonecoil Serpent', 'Endless One', 'Metalwork Colossus', 'Traxos, Scourge of Kroog',
        'Karn, Silver Golem', 'Lodestone Golem', 'Precursor Golem', 'Phyrexian Triniform',
        'Sandstone Oracle', 'Soul of New Phyrexia', 'Sundering Titan', 'Colossus of Akros',
        // Planeswalkers
        'Karn, Scion of Urza', 'Ugin, the Ineffable', 'Ugin, the Spirit Dragon',
        'Karn Liberated', 'Karn, the Great Creator',
        // Removal/Utility
        'All Is Dust', 'Oblivion Stone', 'Nevinyrral\'s Disk', 'Perilous Vault',
        'Spine of Ish Sah', 'Scour from Existence', 'Introduction to Annihilation',
        'Relic of Progenitus', 'Tormod\'s Crypt', 'Soul-Guide Lantern', 'Grafdigger\'s Cage',
        'Pithing Needle', 'Sorcerous Spyglass', 'Ensnaring Bridge', 'Crawlspace',
        // Equipment
        'Sword of the Animist', 'Mask of Memory', 'Trailblazer\'s Boots', 'Whispersilk Cloak',
        'Champion\'s Helm', 'Darksteel Plate', 'Assault Suit', 'Loxodon Warhammer',
        'Sword of Feast and Famine', 'Sword of Fire and Ice', 'Batterskull', 'Umezawa\'s Jitte'
      ]

      // Color-specific deep pool
      const colorDeepPool: Record<string, string[]> = {
        W: [
          'Swords to Plowshares', 'Path to Exile', 'Generous Gift', 'Wrath of God',
          'Day of Judgment', 'Austere Command', 'Sun Titan', 'Elesh Norn, Grand Cenobite',
          'Avacyn, Angel of Hope', 'Iona, Shield of Emeria', 'Karmic Guide', 'Reveillark',
          'Mother of Runes', 'Grand Abolisher', 'Stoneforge Mystic', 'Recruiter of the Guard',
          'Thalia, Guardian of Thraben', 'Smothering Tithe', 'Land Tax', 'Mentor of the Meek',
          'Knight of the White Orchid', 'Weathered Wayfarer', 'Emeria Shepherd', 'Sun Titan',
          'Restoration Angel', 'Flickerwisp', 'Blade Splicer', 'Luminarch Ascension'
        ],
        U: [
          'Counterspell', 'Ponder', 'Brainstorm', 'Rhystic Study', 'Mystic Remora',
          'Cyclonic Rift', 'Swan Song', 'Reality Shift', 'Propaganda', 'Windfall',
          'Blue Sun\'s Zenith', 'Mulldrifter', 'Consecrated Sphinx', 'Jin-Gitaxias, Core Augur',
          'Snapcaster Mage', 'Trinket Mage', 'Trophy Mage', 'Tribute Mage', 'Spellseeker',
          'Mystical Tutor', 'Fact or Fiction', 'Dig Through Time', 'Treasure Cruise',
          'Pongify', 'Rapid Hybridization', 'Arcane Denial', 'Negate', 'Delay'
        ],
        B: [
          'Fatal Push', 'Thoughtseize', 'Dark Ritual', 'Toxic Deluge', 'Damnation',
          'Grave Titan', 'Sheoldred, Whispering One', 'Animate Dead', 'Living Death',
          'Gray Merchant of Asphodel', 'Crypt Ghast', 'Phyrexian Arena', 'Read the Bones',
          'Demonic Tutor', 'Vampiric Tutor', 'Imperial Seal', 'Diabolic Intent',
          'Reanimate', 'Entomb', 'Buried Alive', 'Victimize', 'Dread Return',
          'Zulaport Cutthroat', 'Blood Artist', 'Dictate of Erebos', 'Grave Pact',
          'Yawgmoth\'s Will', 'Necropotence', 'Bolas\'s Citadel', 'K\'rrik, Son of Yawgmoth'
        ],
        R: [
          'Lightning Bolt', 'Monastery Swiftspear', 'Goblin Guide', 'Eidolon of the Great Revel',
          'Etali, Primal Storm', 'Inferno Titan', 'Blasphemous Act', 'Vandalblast',
          'Chaos Warp', 'Zealous Conscripts', 'Kiki-Jiki, Mirror Breaker', 'Dualcaster Mage',
          'Faithless Looting', 'Cathartic Reunion', 'Wheel of Fortune', 'Reforge the Soul',
          'Gamble', 'Imperial Recruiter', 'Goblin Welder', 'Goblin Engineer',
          'Hellkite Tyrant', 'Terror of the Peaks', 'Drakuseth, Maw of Flames',
          'Purphoros, God of the Forge', 'Impact Tremors', 'Goblin Bombardment'
        ],
        G: [
          'Llanowar Elves', 'Birds of Paradise', 'Cultivate', 'Kodama\'s Reach',
          'Avenger of Zendikar', 'Craterhoof Behemoth', 'Beast Within', 'Nature\'s Claim',
          'Heroic Intervention', 'Wood Elves', 'Farhaven Elf', 'Sakura-Tribe Elder',
          'Oracle of Mul Daya', 'Tireless Tracker', 'Eternal Witness', 'Reclamation Sage',
          'Selvala, Heart of the Wilds', 'Selvala, Explorer Returned', 'Priest of Titania',
          'Worldly Tutor', 'Green Sun\'s Zenith', 'Natural Order', 'Finale of Devastation',
          'Tooth and Nail', 'Genesis Wave', 'Boundless Realms', 'Rampant Growth'
        ]
      }

      // Add color-specific cards first
      colors.forEach(color => {
        if (colorDeepPool[color]) {
          colorDeepPool[color].forEach(card => {
            if (nonLandCount < TARGET_NONLANDS && addUniqueCard(card)) nonLandCount++
          })
        }
      })

      // Then colorless cards
      let colorlessIndex = 0
      while (nonLandCount < TARGET_NONLANDS && colorlessIndex < colorlessCards.length) {
        if (addUniqueCard(colorlessCards[colorlessIndex])) nonLandCount++
        colorlessIndex++
      }

      // === LANDS (exactly 37) ===
      let landCount = 0

      // Command Tower first (essential)
      if (addUniqueCard('Command Tower')) landCount++

      // Utility lands
      const utilityLands = [
        'Reliquary Tower', 'Exotic Orchard', 'Myriad Landscape', 'Temple of the False God',
        'Rogue\'s Passage', 'Arch of Orazca', 'War Room', 'Castle Ardenvale',
        'Inventors\' Fair', 'Buried Ruin', 'High Market', 'Phyrexian Tower'
      ]
      utilityLands.forEach(land => { if (landCount < LAND_COUNT && addUniqueCard(land)) landCount++ })

      // Dual lands for multi-color
      if (colors.length >= 2 && landCount < LAND_COUNT) {
        for (let i = 0; i < colors.length - 1 && landCount < LAND_COUNT; i++) {
          const duals = getDualLandName(colors[i], colors[i + 1])
          duals.forEach(dual => { if (landCount < LAND_COUNT && addUniqueCard(dual)) landCount++ })
        }
      }

      // Basic lands to fill remaining
      const basicLandMap: Record<string, string> = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' }
      const colorsToUse = colors.length > 0 ? colors : ['R']
      const remainingLands = LAND_COUNT - landCount

      if (remainingLands > 0) {
        const perColor = Math.floor(remainingLands / colorsToUse.length)
        const extra = remainingLands % colorsToUse.length

        colorsToUse.forEach((color, index) => {
          const count = perColor + (index < extra ? 1 : 0)
          if (count > 0) {
            deck.push({ quantity: count, name: basicLandMap[color] || 'Wastes' })
          }
        })
      }
    } else {
      // 60-card formats - exactly 60 cards
      const TARGET_CARDS = 60
      const LAND_COUNT = rules.recommendedLands
      const TARGET_NONLANDS = TARGET_CARDS - LAND_COUNT

      // Archetype cards
      deck.push(...getArchetypeCards(archetype, rules.maxCopies))

      // Color staples
      deck.push(...getColorStaples(primaryColor, rules.maxCopies))
      if (secondaryColor) deck.push(...getColorStaples(secondaryColor, rules.maxCopies))

      // Calculate current non-land count
      let currentNonLands = deck.reduce((sum, c) => sum + c.quantity, 0)

      // Trim if over
      while (currentNonLands > TARGET_NONLANDS && deck.length > 0) {
        const lastCard = deck[deck.length - 1]
        const excess = currentNonLands - TARGET_NONLANDS
        if (lastCard.quantity <= excess) {
          currentNonLands -= lastCard.quantity
          deck.pop()
        } else {
          lastCard.quantity -= excess
          currentNonLands = TARGET_NONLANDS
        }
      }

      // Add fillers if under
      if (currentNonLands < TARGET_NONLANDS) {
        const needed = TARGET_NONLANDS - currentNonLands
        deck.push(...get60CardFillers(colors, archetype, needed, rules.maxCopies))
      }

      // Recalculate to ensure we have exactly TARGET_NONLANDS
      currentNonLands = deck.reduce((sum, c) => sum + c.quantity, 0)

      // Final adjustment if still short
      if (currentNonLands < TARGET_NONLANDS) {
        const stillNeeded = TARGET_NONLANDS - currentNonLands
        deck.push({ quantity: stillNeeded, name: 'Lightning Bolt' })
      }

      // Add lands
      deck.push(...getFormatLands(colors, LAND_COUNT))

      // Verify total is exactly 60
      const totalCards = deck.reduce((sum, c) => sum + c.quantity, 0)
      if (totalCards < TARGET_CARDS) {
        // Add more basics if short
        const shortage = TARGET_CARDS - totalCards
        const basicName = colors[0] ? { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' }[colors[0]] : 'Mountain'
        deck.push({ quantity: shortage, name: basicName || 'Mountain' })
      }
    }

    return deck
  }

  // Utility cards for commander (no duplicates with staples)
  function getCommanderUtilityPackage(colors: string[]): Array<{ quantity: number; name: string }> {
    const utilities: Array<{ quantity: number; name: string }> = [
      { quantity: 1, name: 'Wayfarer\'s Bauble' },
      { quantity: 1, name: 'Skullclamp' },
      { quantity: 1, name: 'Solemn Simulacrum' },
    ]

    if (colors.includes('U')) {
      utilities.push(
        { quantity: 1, name: 'Rhystic Study' },
        { quantity: 1, name: 'Mystic Remora' },
        { quantity: 1, name: 'Preordain' }
      )
    }
    if (colors.includes('G')) {
      utilities.push(
        { quantity: 1, name: 'Harmonize' },
        { quantity: 1, name: 'Rampant Growth' },
        { quantity: 1, name: 'Farseek' }
      )
    }
    if (colors.includes('B')) {
      utilities.push(
        { quantity: 1, name: 'Phyrexian Arena' },
        { quantity: 1, name: 'Sign in Blood' },
        { quantity: 1, name: 'Night\'s Whisper' }
      )
    }
    if (colors.includes('W')) {
      utilities.push(
        { quantity: 1, name: 'Smothering Tithe' },
        { quantity: 1, name: 'Esper Sentinel' },
        { quantity: 1, name: 'Teferi\'s Protection' }
      )
    }
    if (colors.includes('R')) {
      utilities.push(
        { quantity: 1, name: 'Jeska\'s Will' },
        { quantity: 1, name: 'Wheel of Misfortune' },
        { quantity: 1, name: 'Thrill of Possibility' }
      )
    }
    return utilities
  }

  // Filler cards for commander singleton
  function getCommanderFillerCards(colors: string[], archetype: DeckArchetype, count: number): Array<{ quantity: number; name: string }> {
    const fillers: string[] = [
      // Universal staples
      'Solemn Simulacrum', 'Burnished Hart', 'Skullclamp', 'Darksteel Ingot',
      'Worn Powerstone', 'Thran Dynamo', 'Gilded Lotus', 'Hedron Archive',
    ]

    // Color creatures
    const colorCards: Record<string, string[]> = {
      W: ['Sun Titan', 'Elesh Norn, Grand Cenobite', 'Wrath of God', 'Day of Judgment', 'Austere Command', 'Knight of the White Orchid', 'Stoneforge Mystic', 'Mother of Runes'],
      U: ['Mulldrifter', 'Consecrated Sphinx', 'Cyclonic Rift', 'Swan Song', 'Reality Shift', 'Propaganda', 'Windfall', 'Blue Sun\'s Zenith'],
      B: ['Grave Titan', 'Sheoldred, Whispering One', 'Toxic Deluge', 'Damnation', 'Animate Dead', 'Living Death', 'Gray Merchant of Asphodel', 'Crypt Ghast'],
      R: ['Etali, Primal Storm', 'Inferno Titan', 'Blasphemous Act', 'Vandalblast', 'Goblin Bombardment', 'Impact Tremors', 'Chaos Warp', 'Zealous Conscripts'],
      G: ['Avenger of Zendikar', 'Craterhoof Behemoth', 'Beast Within', 'Nature\'s Claim', 'Heroic Intervention', 'Wood Elves', 'Farhaven Elf', 'Sakura-Tribe Elder'],
    }

    colors.forEach(c => { if (colorCards[c]) fillers.push(...colorCards[c]) })

    // Archetype cards
    const archetypeCards: Record<string, string[]> = {
      Aggro: ['Ogre Battledriver', 'Hellrider', 'Shared Animosity', 'Fervor'],
      Control: ['Propaganda', 'Ghostly Prison', 'Sphere of Safety', 'Maze of Ith'],
      Tribal: ['Herald\'s Horn', 'Vanquisher\'s Banner', 'Coat of Arms', 'Door of Destinies'],
      Tokens: ['Anointed Procession', 'Parallel Lives', 'Divine Visitation', 'Beastmaster Ascension'],
      Aristocrats: ['Zulaport Cutthroat', 'Blood Artist', 'Pitiless Plunderer', 'Dictate of Erebos'],
      Ramp: ['Boundless Realms', 'Skyshroud Claim', 'Explosive Vegetation', 'Migration Path'],
    }
    if (archetypeCards[archetype]) fillers.push(...archetypeCards[archetype])

    const unique = [...new Set(fillers)].slice(0, count)
    return unique.map(name => ({ quantity: 1, name }))
  }

  // Fillers for 60-card formats
  function get60CardFillers(colors: string[], archetype: DeckArchetype, count: number, maxCopies: number): Array<{ quantity: number; name: string }> {
    const result: Array<{ quantity: number; name: string }> = []
    let remaining = count
    const primary = colors[0] || 'R'

    const fillerPool: Array<{ name: string; copies: number }> = []

    // Archetype fillers
    const archetypeFillers: Record<string, Array<{ name: string; copies: number }>> = {
      Aggro: [{ name: 'Bomat Courier', copies: 4 }, { name: 'Soul-Scar Mage', copies: 4 }],
      Burn: [{ name: 'Skullcrack', copies: 4 }, { name: 'Light Up the Stage', copies: 4 }],
      Control: [{ name: 'Absorb', copies: 3 }, { name: 'Supreme Verdict', copies: 2 }],
      Midrange: [{ name: 'Scavenging Ooze', copies: 3 }, { name: 'Tireless Tracker', copies: 2 }],
      Tempo: [{ name: 'Snapcaster Mage', copies: 4 }],
    }
    if (archetypeFillers[archetype]) fillerPool.push(...archetypeFillers[archetype])

    // Color fillers
    const colorFillers: Record<string, Array<{ name: string; copies: number }>> = {
      W: [{ name: 'Thalia, Guardian of Thraben', copies: 3 }, { name: 'Leonin Arbiter', copies: 2 }],
      U: [{ name: 'Opt', copies: 4 }, { name: 'Consider', copies: 4 }],
      B: [{ name: 'Inquisition of Kozilek', copies: 4 }, { name: 'Dread Wanderer', copies: 4 }],
      R: [{ name: 'Searing Blaze', copies: 4 }, { name: 'Flame Rift', copies: 2 }],
      G: [{ name: 'Experiment One', copies: 4 }, { name: 'Pelt Collector', copies: 4 }],
    }
    if (colorFillers[primary]) fillerPool.push(...colorFillers[primary])

    for (const filler of fillerPool) {
      if (remaining <= 0) break
      const qty = Math.min(filler.copies, maxCopies, remaining)
      result.push({ quantity: qty, name: filler.name })
      remaining -= qty
    }

    // If still short, add generic creatures
    while (remaining >= 4) {
      result.push({ quantity: 4, name: 'Raging Goblin' })
      remaining -= 4
    }
    if (remaining > 0) {
      result.push({ quantity: remaining, name: 'Raging Goblin' })
    }

    return result
  }

  function getCommanderForColors(colors: string[], _archetype: DeckArchetype): string {
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

    // Two-color mana base - ensure exactly 'count' lands
    const lands: Array<{ quantity: number; name: string }> = []
    let remaining = count

    // Add dual lands first (up to 8 total, 4 each of 2 types)
    const dualLandNames = getDualLandName(colors[0], colors[1])
    if (dualLandNames.length > 0) {
      dualLandNames.forEach((land) => {
        const qty = Math.min(4, remaining)
        if (qty > 0) {
          lands.push({ quantity: qty, name: land })
          remaining -= qty
        }
      })
    }

    // Fill rest with basics, split between colors
    if (remaining > 0) {
      const firstColorCount = Math.ceil(remaining / 2)
      const secondColorCount = remaining - firstColorCount
      lands.push({ quantity: firstColorCount, name: basicLands[colors[0]] || 'Mountain' })
      if (secondColorCount > 0) {
        lands.push({ quantity: secondColorCount, name: basicLands[colors[1]] || 'Forest' })
      }
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

  return (
    <div className="deck-builder">
      {/* Hidden file input for deck loading */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileLoad}
        accept=".txt,.dec,.dek"
        style={{ display: 'none' }}
      />

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
            className="btn btn-scan"
            onClick={() => setShowScanner(true)}
            title="Scan cards with camera"
          >
            📷 Scan Cards
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
          <button className="btn btn-analyze" onClick={handleAnalyze}>
            📊 Analyze
          </button>
        </div>
      </div>

      {/* Validation Error Toast */}
      {validationError && (
        <div className="validation-error-toast">
          <span className="error-icon">⚠️</span>
          <span>{validationError}</span>
          <button className="dismiss-btn" onClick={() => setValidationError(null)}>×</button>
        </div>
      )}

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

      {/* Camera Scanner Modal */}
      {showScanner && (
        <CameraScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onCardsScanned={handleScannedCards}
          selectedFormat={selectedFormat}
        />
      )}
    </div>
  )
}
