import { useState, useRef, useEffect } from 'react'

export default function ChatAssistant({ keyInfo, currentChord }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const context = {}
      if (keyInfo?.root) context.key = `${keyInfo.root} ${keyInfo.mode}`
      if (currentChord) context.chord = currentChord

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Could not reach the AI assistant. Is the backend running?',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-panel border border-border rounded-2xl p-6 flex flex-col h-80">
      <p className="text-sm text-gray-500 uppercase tracking-widest mb-3">Theory Assistant</p>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-gray-600 text-sm">Ask anything: "What lick works over this chord?" or "Why does the IV sound so resolved?"</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block px-3 py-2 rounded-xl max-w-[85%] ${
              m.role === 'user'
                ? 'bg-accent text-white'
                : 'bg-border text-gray-200'
            }`}>
              {m.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <span className="inline-block px-3 py-2 rounded-xl bg-border text-gray-400 text-sm animate-pulse">
              Thinking…
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Ask about music theory…"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
