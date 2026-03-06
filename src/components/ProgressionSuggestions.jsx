import { getSuggestedProgressions } from '../lib/theory'

export default function ProgressionSuggestions({ keyInfo }) {
  const { root, mode } = keyInfo ?? {}

  if (!root) return null

  const progressions = getSuggestedProgressions(root, mode)

  return (
    <div className="bg-panel border border-border rounded-2xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
        Progressions in {root} {mode}
      </p>
      <div className="space-y-2">
        {progressions.map(prog => (
          <div key={prog.genre} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-10 shrink-0">{prog.genre}</span>
            <div className="flex gap-1.5 flex-wrap">
              {prog.chords.map((chord, i) => (
                <span key={i} className="px-2 py-0.5 bg-border rounded text-sm font-medium">
                  {chord}
                  <span className="ml-1 text-gray-600 text-xs">({prog.rn[i]})</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
