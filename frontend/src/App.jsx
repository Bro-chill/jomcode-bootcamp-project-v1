import React from 'react';
import { Sparkles } from 'lucide-react';
import { api } from './lib/api';
import { useSession } from './hooks/useSession';
import Header from './components/Header';
import Footer from './components/Footer';
import Hero from './components/Hero';
import PostList from './components/PostList';
import PostDetail from './components/PostDetail';
import Editor from './components/Editor';
import Auth from './components/Auth';
import Chat from './components/Chat';
export default function App() {
  const session = useSession();
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [editor, setEditor] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  async function refresh() {
    try {
      setPosts(await api('/posts'));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => {
    refresh();
  }, []);
  const visible = posts.filter(p => `${p.title} ${p.body}`.toLowerCase().includes(query.toLowerCase()));
  const mine = post => session?.user?.id === post.author_id;
  const openCreate = () => session ? setEditor({}) : setAuthOpen(true);
  async function remove(post) {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    try {
      await api(`/posts/${post.id}`, {
        method: 'DELETE'
      });
      setSelected(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }
  return <div className="app">
    <Header session={session} onHome={() => setSelected(null)} onExplore={() => {
      setSelected(null);
      setChatOpen(false);
    }} onChat={() => setChatOpen(true)} onSignIn={() => setAuthOpen(true)} />
    {selected ? <PostDetail post={selected} isOwner={mine(selected)} onBack={() => setSelected(null)} onChat={() => setChatOpen(true)} onEdit={() => setEditor(selected)} onDelete={() => remove(selected)} /> : <>
      <Hero onCreate={openCreate} onChat={() => setChatOpen(true)} />
      <PostList posts={visible} query={query} onQueryChange={setQuery} loading={loading} error={error} onCreate={openCreate} onSelect={setSelected} />
    </>}
    <Footer />
    <button className="chat-fab" title="Ask AI" onClick={() => setChatOpen(true)}>
      <Sparkles size={22} />
    </button>
    {editor && <Editor post={editor.id ? editor : null} onClose={() => setEditor(null)} onSaved={async () => {
      setEditor(null);
      setSelected(null);
      await refresh();
    }} />}
    {authOpen && <Auth onClose={() => setAuthOpen(false)} />}
    {chatOpen && <Chat session={session} onClose={() => setChatOpen(false)} onSignIn={() => {
      setChatOpen(false);
      setAuthOpen(true);
    }} onOpenPost={async id => {
      try {
        const post = posts.find(p => p.id === id) || (await api(`/posts/${id}`));
        setSelected(post);
        setChatOpen(false);
      } catch (err) {
        setError(err.message);
      }
    }} />}
  </div>;
}
