export default function ChordDisplay({ history }) {
  const current = history[history.length - 1]
  const past = history.slice(-8, -1)

  return (
    <div className="bg-panel border border-border rounded-2xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Chord</p>
      <p className="text-4xl font-bold text-amber-400">
        {current ?? '—'}
      </p>
      {past.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {past.map((chord, i) => (
            <span
              key={i}
              className="text-sm px-2 py-1 bg-border rounded text-gray-400"
            >
              {chord}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
