import React from 'react';
import { ArrowRight, BookOpen, LogOut, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
export default function Header({
  session,
  onHome,
  onExplore,
  onChat,
  onSignIn
}) {
  return <header className="site-header">
    <div className="header-inner">
      <a className="brand" href="#home" onClick={onHome}><span className="brand-mark">
          <BookOpen size={18} strokeWidth={2.2} />
        </span>postlight<span className="brand-dot">.</span></a>
      <nav className="header-actions">
        <button className="nav-link" onClick={onExplore}>Explore posts</button>
        <button className="nav-link nav-chat" onClick={onChat}><Sparkles size={15} /> Ask AI</button>
        {session ? <>
          <button className="avatar" title={session.user.email}>
            {session.user.email?.slice(0, 1).toUpperCase()}
          </button>
          <button className="icon-button logout" title="Sign out" onClick={() => supabase.auth.signOut()}>
            <LogOut size={18} />
          </button>
        </> : <button className="button button-small button-outline" onClick={onSignIn}>Sign in <ArrowRight size={15} /></button>}
      </nav>
    </div>
  </header>;
}
