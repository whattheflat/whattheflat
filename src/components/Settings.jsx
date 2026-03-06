const SETTINGS = [
  {
    section: 'Chord Detection',
    items: [
      {
        key: 'chromaSmooth',
        label: 'Chroma Smoothing',
        min: 1, max: 20, step: 1,
        desc: 'Frames to average for chord chroma. More = smoother but slower to react to chord changes.',
      },
      {
        key: 'chordVoteThreshold',
        label: 'Chord Vote Threshold',
        min: 1, max: 8, step: 1,
        desc: 'Consecutive identical detections required to confirm a chord. Higher = more stable, slower.',
      },
      {
        key: 'chordMinScore',
        label: 'Chord Min Score',
        min: 0.10, max: 0.80, step: 0.01,
        desc: 'Minimum coverage score to accept a chord match. Lower = more chord types detected (may add false positives).',
      },
    ],
  },
  {
    section: 'Key Detection',
    items: [
      {
        key: 'noteHistorySize',
        label: 'Note History Size',
        min: 20, max: 400, step: 10,
        desc: 'Pitch readings kept in memory for key detection. Larger = slower to change, but chord boosts dominate more.',
      },
      {
        key: 'keyVoteWindow',
        label: 'Key Vote Window',
        min: 4, max: 30, step: 1,
        desc: 'Rolling window of key votes. Larger = more inertia — key changes need sustained evidence.',
      },
      {
        key: 'keyVoteThreshold',
        label: 'Key Vote Threshold',
        min: 1, max: 30, step: 1,
        desc: 'Votes needed within the window to confirm a key. Higher = stricter consensus required.',
      },
      {
        key: 'chordNoteBoost',
        label: 'Chord Note Boost',
        min: 0, max: 10, step: 1,
        desc: 'Times confirmed chord tones are injected into note history. Higher = chords dominate over transient melody notes.',
      },
    ],
  },
  {
    section: 'Audio Input',
    items: [
      {
        key: 'minClarity',
        label: 'Min Pitch Clarity',
        min: 0.50, max: 0.99, step: 0.01,
        desc: 'Autocorrelation clarity threshold to accept a pitch reading. Higher = only clean, in-tune notes count.',
      },
      {
        key: 'minVolume',
        label: 'Min Volume (RMS)',
        min: 0.001, max: 0.05, step: 0.001,
        desc: 'Minimum signal level before processing. Increase to cut through room noise.',
      },
    ],
  },
]

export default function Settings({ config, onChange, onClose, onReset }) {
  return (
    <div className="fixed inset-0 bg-surface z-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-accent">Detection Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tune chord and key recognition sensitivity in real time</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onReset}
              className="px-4 py-2 rounded-lg text-sm border border-border text-gray-500 hover:text-gray-300 hover:border-gray-400 transition-all"
            >
              Reset defaults
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm bg-accent hover:bg-purple-600 text-white font-semibold transition-all"
            >
              Done
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {SETTINGS.map(section => (
            <div key={section.section}>
              <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4 border-b border-border pb-2">
                {section.section}
              </h3>
              <div className="space-y-6">
                {section.items.map(item => (
                  <div key={item.key}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label className="text-sm font-semibold text-gray-200">{item.label}</label>
                      <span className="text-sm font-mono text-accent w-20 text-right">
                        {Number.isInteger(config[item.key])
                          ? config[item.key]
                          : config[item.key].toFixed(item.step < 0.01 ? 3 : 2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      step={item.step}
                      value={config[item.key]}
                      onChange={e => {
                        const val = item.step < 1
                          ? parseFloat(e.target.value)
                          : parseInt(e.target.value, 10)
                        onChange(item.key, val)
                      }}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-700 mt-0.5">
                      <span>{item.min}</span>
                      <span className="text-gray-600 text-center flex-1 px-2">{item.desc}</span>
                      <span>{item.max}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
