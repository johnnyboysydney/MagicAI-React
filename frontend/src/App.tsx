import { Routes, Route, Link } from 'react-router-dom'
import DeckBuilder from './pages/DeckBuilder/DeckBuilder'
import DeckAnalysis from './pages/DeckAnalysis/DeckAnalysis'
import './App.css'

function Home() {
  return (
    <div className="page">
      <h1>MagicAI</h1>
      <p className="tagline">AI-Powered Deck Analyzer for Magic: The Gathering</p>

      <div className="features">
        <div className="feature-card">
          <h3>Deck Analysis</h3>
          <p>Analyze your deck's mana curve, card types, and synergies</p>
        </div>
        <div className="feature-card">
          <h3>AI Suggestions</h3>
          <p>Get intelligent recommendations to improve your deck</p>
        </div>
        <div className="feature-card">
          <h3>Meta Insights</h3>
          <p>Compare your deck against the current meta</p>
        </div>
      </div>

      <Link to="/deck-builder" className="cta-button">
        Start Building
      </Link>
    </div>
  )
}

function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="logo">MagicAI</Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/deck-builder">Deck Builder</Link>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/deck-builder" element={<DeckBuilder />} />
          <Route path="/analysis" element={<DeckAnalysis />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>&copy; 2025 Deck & Dice Studios. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
