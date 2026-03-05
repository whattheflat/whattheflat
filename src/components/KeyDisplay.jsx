export default function KeyDisplay({ keyInfo, locked = false }) {
  const { root, mode, confidence } = keyInfo ?? {}
  const pct = confidence ? Math.round(confidence * 100) : 0

  return (
    <div className="bg-panel border border-border rounded-2xl p-6 text-center">
      <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">
        {locked ? '🔒 Key (locked)' : 'Detected Key'}
      </p>
      {root ? (
        <>
          <p className="text-6xl font-bold text-accent leading-none">
            {root}
            <span className="text-3xl text-gray-400 ml-2">{mode}</span>
          </p>
          {!locked && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="h-1.5 w-32 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{pct}% confident</span>
            </div>
          )}
        </>
      ) : (
        <p className="text-2xl text-gray-600 mt-2">Listening…</p>
      )}
    </div>
  )
}
