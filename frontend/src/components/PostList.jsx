import React from 'react';
import { ArrowRight, BookOpen, LoaderCircle, Plus, Search } from 'lucide-react';
export default function PostList({
  posts,
  query,
  onQueryChange,
  loading,
  error,
  onCreate,
  onSelect
}) {
  return <main className="wrap main-content">
    <div className="section-heading">
      <div>
        <div className="eyebrow muted">FRESH PERSPECTIVES</div>
        <h2>Latest stories<span className="accent-period">.</span></h2>
      </div>
      <button className="button button-outline new-post" onClick={onCreate}><Plus size={17} /> New post</button>
    </div>
    <div className="toolbar">
      <div className="search-box">
        <Search size={18} />
        <input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search stories..." aria-label="Search stories" />
      </div>
      <span className="story-count">
        {posts.length}
        {" "}
        {posts.length === 1 ? 'story' : 'stories'}
      </span>
    </div>
    {error && <div className="notice error">
      {error}
    </div>}
    {loading ? <div className="empty"><LoaderCircle className="spin" /> Loading stories...</div> : posts.length === 0 ? <div className="empty">
      <BookOpen size={34} />
      <h3>
        {query ? 'No matching stories' : 'The first page is yours to write'}
      </h3>
      <p>
        {query ? 'Try a different search.' : 'Create a post and start the conversation.'}
      </p>
      <button className="button button-dark" onClick={onCreate}>Write a post <ArrowRight size={16} /></button>
    </div> : <div className="post-grid">
      {posts.map((post, index) => <button className="post-card" key={post.id} onClick={() => onSelect(post)}>
        <div className={`card-cover cover-${index % 4}`}>
          {post.image_url ? <img src={post.image_url} alt="" /> : <div className="cover-decoration">
            <span>✦</span>
            <span>✳</span>
          </div>}
        </div>
        <div className="card-content">
          <div className="card-date">
            {new Date(post.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          <h3>
            {post.title}
          </h3>
          <p>
            {post.body}
          </p>
          <div className="card-bottom">
            <span>Read story</span>
            <ArrowRight size={17} />
          </div>
        </div>
      </button>)}
    </div>}
  </main>;
}
