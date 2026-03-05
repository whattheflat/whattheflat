export default function ChordDisplay({ history }) {
  const current = history[history.length - 1]
  const past = history.slice(-8, -1)

  return (
    <div className="bg-panel border border-border rounded-2xl p-6">
      <p className="text-sm text-gray-500 uppercase tracking-widest mb-3">Chord</p>
      <p className="text-5xl font-bold text-amber-400">
        {current ?? '—'}
      </p>
      {past.length > 0 && (
        <div className="mt-4 flex gap-2 flex-wrap">
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
