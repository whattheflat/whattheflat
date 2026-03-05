import { getSuggestedProgressions } from '../lib/theory'

export default function ProgressionSuggestions({ keyInfo }) {
  const { root, mode } = keyInfo ?? {}

  if (!root) return null

  const progressions = getSuggestedProgressions(root, mode)

  return (
    <div className="bg-panel border border-border rounded-2xl p-6">
      <p className="text-sm text-gray-500 uppercase tracking-widest mb-4">
        Progressions in {root} {mode}
      </p>
      <div className="space-y-3">
        {progressions.map(prog => (
          <div key={prog.genre} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-10 shrink-0">{prog.genre}</span>
            <div className="flex gap-2 flex-wrap">
              {prog.chords.map((chord, i) => (
                <span key={i} className="px-3 py-1 bg-border rounded text-sm font-medium">
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
