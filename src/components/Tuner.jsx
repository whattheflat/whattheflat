import { useEffect, useRef, useState } from 'react'
import { useAudioTuner } from '../services/audioService'

// Tuner UI uses pitch data from `useAudioTuner` (autocorrelation handled in the hook)

export default function Tuner() {
  const { pitchData, isListening, startListening, stopListening } = useAudioTuner()
  const [octaveShift, setOctaveShift] = useState(0)
  const canvasRef = useRef(null)
  const historyRef = useRef([])

  // smoothing for display to reduce jitter
  const smoothedRef = useRef({ cents: 0, freq: 0 })
  const [display, setDisplay] = useState({ cents: 0, freq: 0 })
  const SMOOTH_ALPHA = 0.25

  // wire pitchData -> smoothing and history
  useEffect(() => {
    const newFreq = pitchData?.freq || 0
    const newCents = pitchData?.cents || 0
    const prev = smoothedRef.current
    const sf = prev.freq + (newFreq - prev.freq) * SMOOTH_ALPHA
    const sc = prev.cents + (newCents - prev.cents) * SMOOTH_ALPHA
    smoothedRef.current = { freq: sf, cents: sc }
    setDisplay({ freq: Math.round(sf), cents: Math.round(sc) })

    if (isListening && pitchData) {
      historyRef.current.push(pitchData.cents)
      if (historyRef.current.length > 120) historyRef.current.shift()
    } else if (!isListening) {
      historyRef.current = []
    }
  }, [pitchData, isListening])

  // Draw the scrolling graph on the canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const draw = () => {
      const { width, height } = canvas
      // clear (canvas uses device pixels but ctx scaled)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // logical width/height in CSS pixels
      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)

      // Draw background bands (center green, sides red)
      ctx.fillStyle = 'rgba(16,185,129,0.12)'
      ctx.fillRect(w * 0.4, 0, w * 0.2, h)
      ctx.fillStyle = 'rgba(16,185,129,0.28)'
      ctx.fillRect(w * 0.48, 0, w * 0.04, h)

      ctx.fillStyle = 'rgba(239,68,68,0.12)'
      ctx.fillRect(0, 0, w * 0.4, h)
      ctx.fillRect(w * 0.6, 0, w * 0.4, h)

      const history = historyRef.current
      if (history.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.lineJoin = 'round'

        const step = h / (history.length - 1)
        history.forEach((cents, i) => {
          const x = (w / 2) + (cents * (w / 100))
          const y = h - (i * step)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()

        const last = history[history.length - 1]
        const currentX = (w / 2) + (last * (w / 100))
        ctx.beginPath()
        ctx.fillStyle = 'white'
        ctx.arc(currentX, h - 0, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(rafId)
    }
  }, [isListening])


  return (
    <div className="p-6 bg-panel border border-border rounded-xl text-center">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold">Tuner</h3>
        <div>
          <button
            onClick={() => (isListening ? stopListening() : startListening())}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${isListening ? 'bg-red-600' : 'bg-accent'}`}
          >
            {isListening ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-between mb-3 px-6">
            <div className="text-left">
              <div className="text-2xl font-semibold">{display.freq || '—'}</div>
              <div className="text-xs text-gray-400">HERTZ</div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-bold tracking-tight">{pitchData ? `${pitchData.note}${pitchData.octave}` : '—'}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold">{display.cents >= 0 ? `+${display.cents}` : display.cents}</div>
              <div className="text-xs text-gray-400">CENTS</div>
            </div>
          </div>

          <div className="relative bg-black/40 rounded-md overflow-hidden h-90 mb-3">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1/6 pointer-events-none">
              <div className="absolute inset-0 bg-green-600/50 mx-auto w-full rounded"></div>
            </div>
            <div className="absolute inset-y-0 left-0 w-5/12 bg-red-600/20 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-5/12 bg-red-600/20 pointer-events-none" />

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-24 bg-white/30 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
