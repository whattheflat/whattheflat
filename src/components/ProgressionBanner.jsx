import { useRef, useEffect } from 'react'
import { toRomanNumeral } from '../lib/theory'

const HISTORY_SHOWN = 8   // ~2 bars at 4 chords/bar

function findLoopPosition(chordHistory, progression) {
  if (!progression?.length || !chordHistory.length) return -1
  const last = chordHistory[chordHistory.length - 1]
  for (let p = progression.length - 1; p >= 0; p--) {
    if (progression[p] !== last) continue
    let match = true
    for (let i = 1; i < Math.min(p + 1, chordHistory.length); i++) {
      if (progression[p - i] !== chordHistory[chordHistory.length - 1 - i]) { match = false; break }
    }
    if (match) return p
  }
  return progression.indexOf(last)
}

export default function ProgressionBanner({ chordHistory, keyInfo, detectedProgression }) {
  const { root, mode } = keyInfo ?? {}

  // Newest chord is the last entry; we show the most recent HISTORY_SHOWN
  const visible = chordHistory.slice(-HISTORY_SHOWN)
  const current = visible[visible.length - 1]

  // Animate the current chord slot when it changes
  const currentRef = useRef(null)
  const prevChord  = useRef(null)
  useEffect(() => {
    if (current && current !== prevChord.current && currentRef.current) {
      currentRef.current.animate(
        [{ opacity: 0, transform: 'scale(0.85)' },
         { opacity: 1, transform: 'scale(1)' }],
        { duration: 200, easing: 'ease-out', fill: 'forwards' }
      )
      prevChord.current = current
    }
  }, [current])

  const loopPos = findLoopPosition(chordHistory, detectedProgression)

  if (!chordHistory.length) {
    return (
      <div className="bg-panel border border-border rounded-2xl p-5 mb-4 flex items-center justify-center h-28">
        <p className="text-gray-600">Start listening to detect chords…</p>
      </div>
    )
  }

  return (
    <div className="bg-panel border border-border rounded-2xl p-5 mb-4">

      {/* ── Chord history strip: all HISTORY_SHOWN chords at consistent size ── */}
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {visible.map((chord, i) => {
          const isCurrent   = i === visible.length - 1
          const age         = visible.length - 1 - i          // 0 = current, higher = older
          const opacity     = Math.max(0.2, 1 - age * 0.1)    // fade but stay readable
          const rn          = root ? toRomanNumeral(chord, root, mode) : ''

          return (
            <div
              key={i}
              ref={isCurrent ? currentRef : null}
              style={{ opacity }}
              className={`
                flex flex-col items-center justify-end shrink-0 px-3 py-2 rounded-xl
                transition-colors duration-200
                ${isCurrent
                  ? 'bg-accent/10 border border-accent/40 ring-1 ring-accent/20'
                  : 'border border-transparent'}
              `}
            >
              <span className={`font-black leading-none tracking-tight ${
                isCurrent ? 'text-5xl text-accent' : 'text-3xl text-gray-200'
              }`}>
                {chord}
              </span>
              <span className={`text-xs font-semibold mt-1 ${
                isCurrent ? 'text-amber-400' : 'text-gray-500'
              }`}>
                {rn || '\u00A0'}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Detected loop ── */}
      {detectedProgression && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">♻ Detected loop</p>
          <div className="flex gap-2 flex-wrap">
            {detectedProgression.map((chord, i) => {
              const isActive = i === loopPos
              const rn = root ? toRomanNumeral(chord, root, mode) : chord
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-accent/20 border-accent shadow-[0_0_14px_rgba(168,85,247,0.35)]'
                      : 'bg-border border-border'
                  }`}
                >
                  <span className={`text-2xl font-bold leading-none ${isActive ? 'text-accent' : 'text-gray-200'}`}>
                    {chord}
                  </span>
                  <span className={`text-xs mt-1 font-semibold ${isActive ? 'text-amber-400' : 'text-gray-500'}`}>
                    {rn}
                  </span>
                </div>
              )
            })}
            <span className="self-center text-gray-600 text-sm pl-1">→ loop</span>
          </div>
        </div>
      )}
    </div>
  )
}
