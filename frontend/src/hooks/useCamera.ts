import { useRef, useState, useCallback, useEffect } from 'react'

type FacingMode = 'user' | 'environment'
type PermissionState = 'prompt' | 'granted' | 'denied'

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  stream: MediaStream | null
  isActive: boolean
  error: string | null
  permissionState: PermissionState
  facingMode: FacingMode
  startCamera: (facing?: FacingMode) => Promise<void>
  stopCamera: () => void
  captureFrame: () => string | null
  switchCamera: () => Promise<void>
  isMobile: boolean
}

// Detect if running on mobile device
function detectMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Check if camera is supported
function isCameraSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt')
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const isMobile = detectMobile()

  // Get optimal video constraints based on device
  const getConstraints = useCallback((facing: FacingMode): MediaStreamConstraints => {
    return {
      video: {
        facingMode: { ideal: facing },
        width: isMobile ? { ideal: 1280, max: 1920 } : { ideal: 1920 },
        height: isMobile ? { ideal: 720, max: 1080 } : { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    }
  }, [isMobile])

  // Start camera stream
  const startCamera = useCallback(async (facing: FacingMode = 'environment') => {
    // Check browser support
    if (!isCameraSupported()) {
      setError('Camera not supported in this browser')
      setPermissionState('denied')
      return
    }

    // Check secure context
    if (!window.isSecureContext) {
      setError('Camera requires HTTPS or localhost')
      setPermissionState('denied')
      return
    }

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    try {
      setError(null)
      const constraints = getConstraints(facing)
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      streamRef.current = mediaStream
      setStream(mediaStream)
      setFacingMode(facing)
      setPermissionState('granted')

      // Attach to video element and start playing
      if (videoRef.current) {
        const video = videoRef.current
        video.srcObject = mediaStream

        // Function to start playing
        const startPlaying = async () => {
          try {
            await video.play()
            setIsActive(true)
          } catch (e) {
            console.error('Video play failed:', e)
            // Still set active if autoplay was blocked but stream is valid
            setIsActive(true)
          }
        }

        // Check if video is already ready (readyState >= 2 means HAVE_CURRENT_DATA)
        if (video.readyState >= 2) {
          startPlaying()
        } else {
          // Wait for video to be ready
          video.onloadeddata = startPlaying
        }
      } else {
        setIsActive(true)
      }
    } catch (err) {
      const error = err as Error
      setIsActive(false)
      setPermissionState('denied')

      // Handle specific error types
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please enable camera access in your browser settings.')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setError('Camera is in use by another application. Please close it and try again.')
      } else if (error.name === 'OverconstrainedError') {
        // Try again with relaxed constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })
          setStream(fallbackStream)
          setFacingMode(facing)
          setPermissionState('granted')
          if (videoRef.current) {
            const video = videoRef.current
            video.srcObject = fallbackStream

            const startPlaying = async () => {
              try {
                await video.play()
                setIsActive(true)
              } catch (e) {
                console.error('Video play failed:', e)
                setIsActive(true)
              }
            }

            if (video.readyState >= 2) {
              startPlaying()
            } else {
              video.onloadeddata = startPlaying
            }
          } else {
            setIsActive(true)
          }
          return
        } catch {
          setError('Camera constraints not supported.')
        }
      } else {
        setError(`Camera error: ${error.message}`)
      }
    }
  }, [getConstraints])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setStream(null)
    }
    setIsActive(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Switch between front and back camera
  const switchCamera = useCallback(async () => {
    const newFacing: FacingMode = facingMode === 'user' ? 'environment' : 'user'
    await startCamera(newFacing)
  }, [facingMode, startCamera])

  // Capture current frame as base64 JPEG
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      return null
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return null
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0)

    // Convert to base64 JPEG (0.92 quality for good balance of size/quality)
    return canvas.toDataURL('image/jpeg', 0.92)
  }, [])

  // Check permission state on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then(result => {
          setPermissionState(result.state as PermissionState)

          // Listen for permission changes
          result.addEventListener('change', () => {
            setPermissionState(result.state as PermissionState)
          })
        })
        .catch(() => {
          // Permission query not supported, stay at 'prompt'
        })
    }
  }, [])

  // Attach stream to video element when stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current
      video.srcObject = stream

      const startPlaying = async () => {
        try {
          await video.play()
          setIsActive(true)
        } catch (e) {
          console.error('Video play failed:', e)
          setIsActive(true)
        }
      }

      if (video.readyState >= 2) {
        startPlaying()
      } else {
        video.onloadeddata = startPlaying
      }
    }
  }, [stream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return {
    videoRef,
    canvasRef,
    stream,
    isActive,
    error,
    permissionState,
    facingMode,
    startCamera,
    stopCamera,
    captureFrame,
    switchCamera,
    isMobile,
  }
}
