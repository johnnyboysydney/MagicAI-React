import { useState, useCallback, useEffect, useRef } from 'react'
import { useCamera } from '../../hooks/useCamera'
import {
  recognizeSingleCard,
  recognizeMultipleCards,
  isAIAvailable,
  type RecognizedCard,
} from '../../services/cardRecognition'
import { getCardImageUrl } from '../../types/card'
import type { ScryfallCard } from '../../types/card'
import './CameraScanner.css'

interface CameraScannerProps {
  isOpen: boolean
  onClose: () => void
  onCardsScanned: (cards: ScryfallCard[]) => void
  selectedFormat: string
}

type ScanMode = 'single' | 'batch'
type ScanState = 'camera' | 'processing' | 'results'

export default function CameraScanner({
  isOpen,
  onClose,
  onCardsScanned,
}: CameraScannerProps) {
  const {
    videoRef,
    canvasRef,
    stream,
    error: cameraError,
    permissionState,
    facingMode,
    startCamera,
    stopCamera,
    captureFrame,
    switchCamera,
    isMobile,
  } = useCamera()

  const [mode, setMode] = useState<ScanMode>('single')
  const [scanState, setScanState] = useState<ScanState>('camera')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [scannedCards, setScannedCards] = useState<RecognizedCard[]>([])
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [scanError, setScanError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraStartedRef = useRef(false)

  // Start camera when modal opens (only once)
  useEffect(() => {
    if (isOpen && !cameraStartedRef.current && permissionState !== 'denied') {
      cameraStartedRef.current = true
      // Default to rear camera on mobile, front on desktop
      startCamera(isMobile ? 'environment' : 'user')
    }

    // Reset when modal closes
    if (!isOpen) {
      cameraStartedRef.current = false
    }
  }, [isOpen, permissionState, isMobile]) // Removed startCamera from deps

  // Stop camera when modal closes
  useEffect(() => {
    if (!isOpen && stream) {
      stopCamera()
    }
  }, [isOpen, stream, stopCamera])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-attach stream to video when returning to camera view
  useEffect(() => {
    if (scanState === 'camera' && stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(e => console.error('Video play failed:', e))
    }
  }, [scanState, stream, videoRef])

  // Handle capture button click
  const handleCapture = useCallback(async () => {
    const image = captureFrame()
    if (!image) {
      setScanError('Failed to capture image. Please try again.')
      return
    }

    setCapturedImage(image)
    setScanState('processing')
    setScanError(null)
    setScannedCards([])

    try {
      const result = mode === 'single'
        ? await recognizeSingleCard(image)
        : await recognizeMultipleCards(image)

      setScannedCards(result.cards)

      // Auto-select cards that were successfully identified
      const successfulCards = result.cards
        .filter(c => c.scryfallCard)
        .map(c => c.name)
      setSelectedCards(new Set(successfulCards))

      if (result.errors.length > 0) {
        setScanError(result.errors.join('. '))
      }

      setScanState('results')
    } catch (err) {
      console.error('Scan failed:', err)
      setScanError('Recognition failed. Please try again.')
      setScanState('camera')
    }
  }, [captureFrame, mode])

  // Handle file upload (fallback)
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const image = event.target?.result as string
      if (!image) return

      setCapturedImage(image)
      setScanState('processing')
      setScanError(null)

      try {
        const result = mode === 'single'
          ? await recognizeSingleCard(image)
          : await recognizeMultipleCards(image)

        setScannedCards(result.cards)
        const successfulCards = result.cards
          .filter(c => c.scryfallCard)
          .map(c => c.name)
        setSelectedCards(new Set(successfulCards))

        if (result.errors.length > 0) {
          setScanError(result.errors.join('. '))
        }

        setScanState('results')
      } catch (err) {
        console.error('Scan failed:', err)
        setScanError('Recognition failed. Please try again.')
        setScanState('camera')
      }
    }
    reader.readAsDataURL(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [mode])

  // Toggle card selection
  const toggleCardSelection = useCallback((cardName: string) => {
    setSelectedCards(prev => {
      const next = new Set(prev)
      if (next.has(cardName)) {
        next.delete(cardName)
      } else {
        next.add(cardName)
      }
      return next
    })
  }, [])

  // Add selected cards to deck
  const handleAddToDeck = useCallback(() => {
    const cardsToAdd = scannedCards
      .filter(c => c.scryfallCard && selectedCards.has(c.name))
      .map(c => c.scryfallCard!)

    if (cardsToAdd.length > 0) {
      onCardsScanned(cardsToAdd)
    }
    onClose()
  }, [scannedCards, selectedCards, onCardsScanned, onClose])

  // Reset to camera view for another scan
  const handleScanMore = useCallback(() => {
    setCapturedImage(null)
    setScannedCards([])
    setSelectedCards(new Set())
    setScanError(null)
    setScanState('camera')
  }, [])

  // Handle retake
  const handleRetake = useCallback(() => {
    handleScanMore()
  }, [handleScanMore])

  // Request camera permission
  const handleRequestPermission = useCallback(() => {
    startCamera(isMobile ? 'environment' : 'user')
  }, [startCamera, isMobile])

  if (!isOpen) return null

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="scanner-header">
          <div className="scanner-title">
            <span className="scanner-icon">📷</span>
            <span>Scan Cards</span>
          </div>
          <div className="scanner-mode-toggle">
            <button
              className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
              onClick={() => setMode('single')}
            >
              Single
            </button>
            <button
              className={`mode-btn ${mode === 'batch' ? 'active' : ''}`}
              onClick={() => setMode('batch')}
            >
              Batch
            </button>
          </div>
          <button className="scanner-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="scanner-body">
          {/* Permission denied state */}
          {permissionState === 'denied' && (
            <div className="scanner-permission">
              <div className="permission-icon">🚫</div>
              <h3>Camera Access Required</h3>
              <p>Please enable camera access in your browser settings to scan cards.</p>
              <button className="btn btn-primary" onClick={handleRequestPermission}>
                Try Again
              </button>
              <div className="permission-fallback">
                <p>Or upload an image instead:</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="file-input"
                />
              </div>
            </div>
          )}

          {/* Camera view */}
          {permissionState !== 'denied' && scanState === 'camera' && (
            <>
              <div className="camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                />
                <canvas ref={canvasRef} className="capture-canvas" />

                {/* Card frame overlay */}
                <div className="card-frame-overlay">
                  <div className="card-frame">
                    {mode === 'single' ? (
                      <span className="frame-hint">Position card here</span>
                    ) : (
                      <span className="frame-hint">Position cards here</span>
                    )}
                  </div>
                </div>

                {/* Loading overlay */}
                {!stream && !cameraError && (
                  <div className="camera-loading">
                    <span className="loading-spinner">⏳</span>
                    <span>Starting camera...</span>
                  </div>
                )}
              </div>

              {/* Camera error */}
              {cameraError && (
                <div className="scanner-error">
                  <span>⚠️</span> {cameraError}
                </div>
              )}

              {/* Controls */}
              <div className="scanner-controls">
                {isMobile && stream && (
                  <button
                    className="control-btn switch-btn"
                    onClick={switchCamera}
                    title="Switch camera"
                  >
                    🔄 {facingMode === 'environment' ? 'Front' : 'Back'}
                  </button>
                )}
                <button
                  className="control-btn capture-btn"
                  onClick={handleCapture}
                  disabled={!stream}
                >
                  📸 Capture
                </button>
                <label className="control-btn upload-btn">
                  📁 Upload
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    hidden
                  />
                </label>
              </div>

              {/* Mode hint */}
              <div className="mode-hint">
                {mode === 'single' ? (
                  <small>💡 Position one card clearly in the frame</small>
                ) : (
                  <small>💡 Position multiple cards in the frame (up to 5)</small>
                )}
                {!isAIAvailable() && (
                  <small className="ai-warning">
                    ⚠️ AI fallback not configured. Add VITE_GOOGLE_API_KEY for better recognition.
                  </small>
                )}
              </div>
            </>
          )}

          {/* Processing state */}
          {scanState === 'processing' && (
            <div className="processing-container">
              {capturedImage && (
                <img src={capturedImage} alt="Captured" className="captured-image" />
              )}
              <div className="processing-overlay">
                <span className="processing-spinner">⏳</span>
                <span>Recognizing card{mode === 'batch' ? 's' : ''}...</span>
              </div>
            </div>
          )}

          {/* Results state */}
          {scanState === 'results' && (
            <div className="results-container">
              {/* Captured image thumbnail */}
              {capturedImage && (
                <div className="captured-preview">
                  <img src={capturedImage} alt="Captured" />
                </div>
              )}

              {/* Error message */}
              {scanError && (
                <div className="scanner-error">
                  <span>⚠️</span> {scanError}
                </div>
              )}

              {/* Scanned cards list */}
              <div className="scanned-cards">
                <h4>
                  Scanned Cards ({scannedCards.filter(c => c.scryfallCard).length} recognized)
                </h4>
                {scannedCards.length === 0 ? (
                  <div className="no-cards">No cards detected. Try again with a clearer image.</div>
                ) : (
                  <div className="cards-list">
                    {scannedCards.map((card, index) => (
                      <div
                        key={`${card.name}-${index}`}
                        className={`scanned-card ${card.scryfallCard ? 'success' : 'failed'}`}
                      >
                        <label className="card-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedCards.has(card.name)}
                            onChange={() => toggleCardSelection(card.name)}
                            disabled={!card.scryfallCard}
                          />
                          <span className="checkmark" />
                        </label>
                        {card.scryfallCard && (
                          <img
                            src={getCardImageUrl(card.scryfallCard, 'small')}
                            alt={card.name}
                            className="card-thumbnail"
                          />
                        )}
                        <div className="card-info">
                          <span className="card-name">{card.name}</span>
                          <span className="card-method">
                            {card.method === 'ocr' ? '📝 OCR' : '🤖 AI'}
                            {' • '}
                            {card.confidence}
                          </span>
                        </div>
                        <span className={`card-status ${card.scryfallCard ? 'ok' : 'error'}`}>
                          {card.scryfallCard ? '✅' : '⚠️'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Result actions */}
              <div className="result-actions">
                <button className="btn btn-secondary" onClick={handleRetake}>
                  🔄 Retake
                </button>
                <button className="btn btn-secondary" onClick={handleScanMore}>
                  📷 Scan More
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddToDeck}
                  disabled={selectedCards.size === 0}
                >
                  ➕ Add {selectedCards.size} to Deck
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
