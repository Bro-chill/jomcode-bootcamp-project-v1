import React from 'react';
import { ArrowLeft, Sparkles, Trash2 } from 'lucide-react';
export default function PostDetail({
  post,
  isOwner,
  onBack,
  onChat,
  onEdit,
  onDelete
}) {
  return <article className="detail wrap">
    <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> All posts</button>
    <div className="detail-content">
      <div className="eyebrow">THE JOURNAL <span className="eyebrow-line" /></div>
      <h1>
        {post.title}
      </h1>
      <div className="post-meta"><span className="tiny-avatar">
          {post.author_id.slice(0, 1).toUpperCase()}
        </span> Community author <span className="meta-dot">·</span> {new Date(post.created_at).toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}</div>
      {post.image_url && <img className="detail-image" src={post.image_url} alt="" />}
      <div className="detail-body">
        {post.body}
      </div>
      <div className="detail-footer">
        <button className="text-action" onClick={onChat}><Sparkles size={17} /> Ask AI about this post</button>
        {isOwner && <div className="owner-actions">
          <button onClick={onEdit}>Edit post</button>
          <button className="danger" onClick={onDelete}><Trash2 size={15} /> Delete</button>
        </div>}
      </div>
    </div>
  </article>;
}
