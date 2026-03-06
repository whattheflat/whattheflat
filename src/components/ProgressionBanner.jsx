import { useRef, useEffect } from 'react'
import { toRomanNumeral } from '../lib/theory'

const HISTORY_SHOWN = 8

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

export default function ProgressionBanner({ chordHistory, keyInfo, detectedProgression, currentChord }) {
  const { root, mode, confidence } = keyInfo ?? {}

  const visible = chordHistory.slice(-HISTORY_SHOWN)
  const current = visible[visible.length - 1]
  const loopPos = findLoopPosition(chordHistory, detectedProgression)
  const currentRN = root && current ? toRomanNumeral(current, root, mode) : ''

  const currentRef = useRef(null)
  const prevChord  = useRef(null)
  useEffect(() => {
    if (current && current !== prevChord.current && currentRef.current) {
      currentRef.current.animate(
        [{ opacity: 0, transform: 'scale(0.85)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 200, easing: 'ease-out', fill: 'forwards' }
      )
      prevChord.current = current
    }
  }, [current])

  return (
    <div className="bg-panel border border-border rounded-2xl p-4 mb-3 flex gap-4">

      {/* ── Left: key + chord history + loop ── */}
      <div className="w-full lg:w-[70%] min-w-0 flex flex-col gap-2">

        {/* Key + history on one row */}
        <div className="flex items-end gap-3">
          <div className="shrink-0 flex items-baseline gap-1.5">
            {root ? (
              <>
                <span className="text-2xl font-bold text-accent">{root}</span>
                <span className="text-gray-400 text-sm">{mode}</span>
                {confidence && (
                  <span className="text-xs text-gray-600">{Math.round(confidence * 100)}%</span>
                )}
              </>
            ) : (
              <span className="text-gray-600 text-sm">Detecting key…</span>
            )}
          </div>

          <div className="w-px h-6 bg-border shrink-0" />

          {!chordHistory.length ? (
            <p className="text-gray-600 text-sm">Start listening…</p>
          ) : (
            <div className="flex items-end gap-1 overflow-x-auto pb-1">
              {visible.map((chord, i) => {
                const isCurrent = i === visible.length - 1
                const age       = visible.length - 1 - i
                const opacity   = Math.max(0.25, 1 - age * 0.09)
                const rn        = root ? toRomanNumeral(chord, root, mode) : ''
                return (
                  <div
                    key={i}
                    ref={isCurrent ? currentRef : null}
                    style={{ opacity }}
                    className={`flex flex-col items-center shrink-0 px-2 py-1 rounded-xl transition-colors duration-200 ${
                      isCurrent
                        ? 'bg-accent/10 border border-accent/40 ring-1 ring-accent/20'
                        : 'border border-transparent'
                    }`}
                  >
                    <span className={`font-black leading-none tracking-tight ${
                      isCurrent ? 'text-3xl text-accent' : 'text-xl text-gray-200'
                    }`}>
                      {chord}
                    </span>
                    <span className={`text-xs font-semibold mt-0.5 ${
                      isCurrent ? 'text-amber-400' : 'text-gray-500'
                    }`}>
                      {rn || '\u00A0'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Loop */}
        {detectedProgression && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500">♻</span>
            {detectedProgression.map((chord, i) => {
              const isActive = i === loopPos
              const rn = root ? toRomanNumeral(chord, root, mode) : chord
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center px-2 py-0.5 rounded-lg border transition-all duration-200 ${
                    isActive
                      ? 'bg-accent/20 border-accent shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                      : 'bg-border border-border'
                  }`}
                >
                  <span className={`text-sm font-bold leading-none ${isActive ? 'text-accent' : 'text-gray-300'}`}>
                    {chord}
                  </span>
                  <span className={`text-xs ${isActive ? 'text-amber-400' : 'text-gray-600'}`}>{rn}</span>
                </div>
              )
            })}
            <span className="text-gray-600 text-xs">→ loop</span>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="hidden lg:block w-px bg-border shrink-0" />

      {/* ── Right: big chord ── */}
      <div className="hidden lg:flex w-[30%] flex-col items-center justify-center gap-1">
        {current ? (
          <>
            <p className="text-xs text-gray-600 uppercase tracking-widest">Now Playing</p>
            <div className="text-6xl font-black text-amber-400 leading-none">{current}</div>
            <div className="text-sm text-gray-500">{currentRN}</div>
          </>
        ) : (
          <p className="text-gray-600 text-xs text-center">Play a chord</p>
        )}
      </div>

    </div>
  )
}
