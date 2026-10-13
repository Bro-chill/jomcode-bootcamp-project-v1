import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
export default function Hero({
  onCreate,
  onChat
}) {
  return <section className="hero">
    <div className="wrap hero-inner">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> A SPACE FOR IDEAS</div>
        <h1>Stories worth <em>sharing.</em></h1>
        <p>A place for thoughts, discoveries, and everything in between. Read what the community is writing, or add your own voice.</p>
        <div className="hero-buttons">
          <button className="button button-dark" onClick={onCreate}>Write a post <ArrowRight size={18} /></button>
          <button className="button button-plain" onClick={onChat}><Sparkles size={17} /> Explore with AI</button>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="art-paper">
          <div className="art-line short" />
          <div className="art-line" />
          <div className="art-line medium" />
          <div className="art-line" />
          <div className="art-line tiny" />
        </div>
        <div className="art-sun" />
        <div className="art-star">✳</div>
      </div>
    </div>
  </section>;
}
