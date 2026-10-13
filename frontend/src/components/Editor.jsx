import React from 'react';
import { Check, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { api } from '../lib/api';
export default function Editor({
  post,
  onClose,
  onSaved
}) {
  const [title, setTitle] = React.useState(post?.title || '');
  const [body, setBody] = React.useState(post?.body || '');
  const [image, setImage] = React.useState(null);
  const [removeImage, setRemoveImage] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const preview = React.useMemo(() => image ? URL.createObjectURL(image) : null, [image]);
  React.useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('body', body.trim());
      if (image) form.append('image', image);
      if (removeImage) form.append('remove_existing_image', 'true');
      await api(post ? `/posts/${post.id}` : '/posts', {
        method: post ? 'PUT' : 'POST',
        body: form
      });
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return <div className="modal-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div className="modal editor-modal">
      <div className="modal-head">
        <div>
          <div className="eyebrow muted">YOUR STORY</div>
          <h2>
            {post ? 'Edit your post' : 'Write something new'}
          </h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close">
          <X size={21} />
        </button>
      </div>
      <form onSubmit={submit}>
        <label>Title<input value={title} maxLength={160} required onChange={event => setTitle(event.target.value)} placeholder="Give your story a title" /></label>
        <label>Your story<textarea value={body} maxLength={20000} required onChange={event => setBody(event.target.value)} placeholder="Start writing here..." rows={8} /></label>
        <label className="image-label">Cover image <span>Optional · PNG, JPG or WebP · max 5 MB</span></label>
        <label className="upload-box">
          {preview || post?.image_url && !removeImage ? <img src={preview || post.image_url} alt="Cover preview" /> : <>
            <ImagePlus size={25} />
            <span>Click to upload an image</span>
          </>}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
            setImage(event.target.files?.[0] || null);
            setRemoveImage(false);
          }} />
        </label>
        {post?.image_url && !image && !removeImage && <button className="remove-image" type="button" onClick={() => setRemoveImage(true)}>Remove current image</button>}
        {error && <div className="notice error">
          {error}
        </div>}
        <div className="modal-actions">
          <button className="button button-outline" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-dark" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
            {" "}
            {busy ? 'Saving...' : post ? 'Save changes' : 'Publish post'}
          </button>
        </div>
      </form>
    </div>
  </div>;
}
