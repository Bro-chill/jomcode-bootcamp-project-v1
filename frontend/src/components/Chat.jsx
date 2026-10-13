import React from 'react';
import { ArrowRight, BookOpen, LoaderCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api';
export default function Chat({
  session,
  onClose,
  onSignIn,
  onOpenPost
}) {
  const [question, setQuestion] = React.useState('');
  const [messages, setMessages] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const bottom = React.useRef(null);
  React.useEffect(() => {
    bottom.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, busy]);
  async function send(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setQuestion('');
    setMessages(current => [...current, {
      role: 'user',
      text
    }]);
    setBusy(true);
    try {
      const result = await api('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: text
        })
      });
      setMessages(current => [...current, {
        role: 'assistant',
        text: result.answer,
        sources: result.sources
      }]);
    } catch (err) {
      setMessages(current => [...current, {
        role: 'assistant',
        text: `Sorry, I couldn't answer that. ${err.message}`,
        sources: []
      }]);
    } finally {
      setBusy(false);
    }
  }
  return <div className="drawer-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <aside className="chat-drawer">
      <div className="chat-head">
        <div className="chat-icon">
          <Sparkles size={20} />
        </div>
        <div>
          <h2>Ask Postlight AI</h2>
          <p>Curious about a story? Just ask.</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close chat">
          <X size={21} />
        </button>
      </div>
      <div className="chat-messages">
        {!session ? <div className="chat-welcome">
          <div className="welcome-icon">
            <MessageCircle size={28} />
          </div>
          <h3>Find more in every story.</h3>
          <p>Sign in to ask questions across all published posts.</p>
          <button className="button button-dark" onClick={onSignIn}>Sign in to chat <ArrowRight size={16} /></button>
        </div> : messages.length === 0 ? <div className="chat-welcome">
          <div className="welcome-icon">
            <Sparkles size={28} />
          </div>
          <h3>What would you like to know?</h3>
          <p>Ask a question and I'll search the stories for an answer.</p>
          <div className="suggestions">
            {['What are the latest posts about?', 'Summarize the main ideas'].map(text => <button key={text} onClick={() => setQuestion(text)}>
              {text}
              {" "}
              <ArrowRight size={14} />
            </button>)}
          </div>
        </div> : messages.map((message, index) => <div key={index} className={`message ${message.role}`}>
          <div className="message-label">
            {message.role === 'assistant' ? <><Sparkles size={13} /> POSTLIGHT AI</> : 'YOU'}
          </div>
          <div className="message-bubble">
            {message.text}
          </div>
          {message.sources?.length > 0 && <div className="sources">
            <span>Sources</span>
            {message.sources.map(source => <button key={source.id} onClick={() => onOpenPost(source.id)}>
              <BookOpen size={13} />
              {source.title}
              <ArrowRight size={12} />
            </button>)}
          </div>}
        </div>)}
        {busy && <div className="thinking"><LoaderCircle className="spin" size={16} /> Searching stories...</div>}
        <div ref={bottom} />
      </div>
      {session && <form className="chat-input" onSubmit={send}>
        <input value={question} onChange={event => setQuestion(event.target.value)} maxLength={2000} placeholder="Ask about the posts..." aria-label="Ask about the posts" />
        <button disabled={busy || !question.trim()} title="Send question">
          <Send size={18} />
        </button>
      </form>}
      <div className="chat-disclaimer">Answers are based on published posts.</div>
    </aside>
  </div>;
}
