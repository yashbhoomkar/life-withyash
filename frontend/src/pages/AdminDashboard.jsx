import { useEffect, useState } from 'react';
import { apiUrl } from '../api.js';

const sectionDefaults = [
  ['songs-on-loop', 'Songs On Loop'], ['clicks', 'Clicks'], ['dialogues', 'Dialogues'], ['connect', 'Connect'], ['links', 'Links'],
];

function AuthForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      const response = await fetch(apiUrl('/api/admin/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const responseText = await response.text();
      let result = {};
      try { result = responseText ? JSON.parse(responseText) : {}; } catch { /* handled with a readable API error below */ }
      if (!responseText || (responseText && Object.keys(result).length === 0)) {
        throw new Error('The backend did not return a login response. Restart backend/start-backend and frontend/start-frontend, then try again.');
      }
      if (!response.ok) throw new Error(result.error || 'Login failed.');
      onLogin(result.token);
    } catch (failure) { setError(failure.message); }
  }
  return <form className="admin-card admin-login" onSubmit={submit}>
    <h1>For Yash</h1><p>Sign in to manage the site.</p>
    <label className="admin-field">Username<input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} /></label>
    <label className="admin-field">Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    <button className="admin-button">Sign in</button><p className="admin-status" role="status">{error}</p>
  </form>;
}

function AdminForm({ title, children, onSubmit, status }) {
  return <form className="admin-card" onSubmit={onSubmit}><h2>{title}</h2>{children}<button className="admin-button">Save</button>{status && <p className="admin-status" role="status">{status}</p>}</form>;
}

function fileDimensions(file) {
  return createImageBitmap(file).then((bitmap) => ({ bitmap, width: bitmap.width, height: bitmap.height }));
}

async function makeJpeg(file, maxSide, quality) {
  const { bitmap, width, height } = await fileDimensions(file);
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return { blob, width: canvas.width, height: canvas.height };
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem('adminToken') || '');
  const [sections, setSections] = useState(sectionDefaults.map(([key, title], order) => ({ key, title, order })));
  const [playlists, setPlaylists] = useState([]); const [dialogues, setDialogues] = useState([]); const [photos, setPhotos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [visitCount, setVisitCount] = useState(0);
  const [playlistTitle, setPlaylistTitle] = useState(''); const [playlistUrl, setPlaylistUrl] = useState('');
  const [dialogue, setDialogue] = useState(''); const [photoName, setPhotoName] = useState(''); const [photoFile, setPhotoFile] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [showSectionModal, setShowSectionModal] = useState(false); const [newSectionName, setNewSectionName] = useState('');
  const headers = { Authorization: `Bearer ${token}` };
  async function api(path, options = {}) {
    const response = await fetch(apiUrl(path), { ...options, headers: { ...headers, ...options.headers } });
    if (response.status === 401) { sessionStorage.removeItem('adminToken'); setToken(''); throw new Error('Your session expired. Please sign in again.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not save changes.');
    return data;
  }
  useEffect(() => {
    if (!token) return;
    Promise.all([api('/api/admin/messages'), api('/api/content'), api('/api/admin/visits')]).then(([savedMessages, content, visits]) => {
      setMessages(savedMessages); setSections(content.sections); setPlaylists(content.playlists); setDialogues(content.dialogues); setPhotos(content.cars); setVisitCount(visits.count);
    }).catch((error) => setStatuses((s) => ({ ...s, messages: error.message })));
  }, [token]);
  useEffect(() => {
    if (!token) return undefined;
    const refreshCount = () => api('/api/admin/visits').then((result) => setVisitCount(result.count)).catch(() => {});
    const interval = window.setInterval(refreshCount, 15000);
    return () => window.clearInterval(interval);
  }, [token]);
  function login(value) { sessionStorage.setItem('adminToken', value); setToken(value); }
  async function action(key, work) {
    setStatuses((s) => ({ ...s, [key]: 'Saving…' }));
    try { await work(); setStatuses((s) => ({ ...s, [key]: 'Saved.' })); }
    catch (error) { setStatuses((s) => ({ ...s, [key]: error.message })); }
  }
  function removeRecord(type, record, label) {
    if (!window.confirm(`Remove ${label}?`)) return;
    action(`remove-${type}-${record}`, async () => {
      await api(`/api/admin/${type}/${encodeURIComponent(record)}`, { method: 'DELETE' });
      if (type === 'playlists') setPlaylists((items) => items.filter((item) => item.slug !== record));
      if (type === 'dialogues') setDialogues((items) => items.filter((item) => item.id !== record));
      if (type === 'photos') setPhotos((items) => items.filter((item) => item.slug !== record));
    });
  }
  if (!token) return <main className="admin-main"><AuthForm onLogin={login} /></main>;

  return <main className="admin-main">
    <div className="admin-heading"><div><p>YAXH / ADMIN</p><h1>Dashboard</h1></div><div className="admin-heading-actions"><div className="admin-visit-stat"><span>Website visits</span><strong>{visitCount.toLocaleString()}</strong></div><button className="admin-button" onClick={() => { sessionStorage.removeItem('adminToken'); setToken(''); }}>Sign out</button></div></div>
    <section className="admin-grid">
      <div className="admin-card admin-sections">
        <h2>Section names</h2>
        {sections.map((section) => <label className="admin-field" key={section.key}>
          {section.key.replaceAll('-', ' ')}
          <input value={section.title} maxLength={60} onChange={(event) => setSections((all) => all.map((item) => item.key === section.key ? { ...item, title: event.target.value } : item))} />
          <button className="admin-button" type="button" onClick={() => action(`section-${section.key}`, async () => {
            const data = await api(`/api/admin/sections/${section.key}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: section.title }) });
            setSections((all) => all.map((item) => item.key === data.key ? data : item));
          })}>Update</button>
          {statuses[`section-${section.key}`] && <small>{statuses[`section-${section.key}`]}</small>}
        </label>)}
        <button className="admin-button admin-add-section" type="button" onClick={() => { setNewSectionName(''); setShowSectionModal(true); }}>Add section</button>
        {statuses['new-section'] && <p className="admin-status">{statuses['new-section']}</p>}
      </div>
      <AdminForm title="Add a Spotify playlist" status={statuses.playlist} onSubmit={(e) => { e.preventDefault(); action('playlist', async () => {
        const created = await api('/api/admin/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: playlistTitle, url: playlistUrl }) });
        setPlaylists((items) => [...items, created]); setPlaylistTitle(''); setPlaylistUrl('');
      }); }}>
        <label className="admin-field">Playlist name<input required maxLength={100} value={playlistTitle} onChange={(e) => setPlaylistTitle(e.target.value)} /></label>
        <label className="admin-field">Spotify playlist URL<input type="url" required placeholder="https://open.spotify.com/playlist/…" value={playlistUrl} onChange={(e) => setPlaylistUrl(e.target.value)} /></label>
        <ul className="admin-record-list">{playlists.length ? playlists.map((item) => <li className="admin-record" key={item.slug}><span>{item.title}</span><button className="admin-button" type="button" onClick={() => removeRecord('playlists', item.slug, item.title)}>Remove</button>{statuses[`remove-playlists-${item.slug}`] && <small>{statuses[`remove-playlists-${item.slug}`]}</small>}</li>) : <li className="admin-status">No playlists saved.</li>}</ul>
      </AdminForm>
      <AdminForm title="Add a dialogue" status={statuses.dialogue} onSubmit={(e) => { e.preventDefault(); action('dialogue', async () => {
        const created = await api('/api/admin/dialogues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: dialogue }) });
        setDialogues((items) => [...items, created]); setDialogue('');
      }); }}>
        <label className="admin-field">Dialogue<textarea required maxLength={1000} rows={4} value={dialogue} onChange={(e) => setDialogue(e.target.value)} /></label>
        <ul className="admin-record-list">{dialogues.length ? dialogues.map((item) => <li className="admin-record" key={item.id}><span>{item.text}</span><button className="admin-button" type="button" onClick={() => removeRecord('dialogues', item.id, 'this dialogue')}>Remove</button>{statuses[`remove-dialogues-${item.id}`] && <small>{statuses[`remove-dialogues-${item.id}`]}</small>}</li>) : <li className="admin-status">No dialogues saved.</li>}</ul>
      </AdminForm>
      <AdminForm title="Upload a photo" status={statuses.photo} onSubmit={async (e) => { e.preventDefault(); if (!photoFile) return; await action('photo', async () => {
        const [full, thumb] = await Promise.all([makeJpeg(photoFile, 2400, .9), makeJpeg(photoFile, 640, .82)]);
        const form = new FormData(); form.append('name', photoName); form.append('image', full.blob, 'photo.jpg'); form.append('thumbnail', thumb.blob, 'thumbnail.jpg');
        form.append('imageWidth', full.width); form.append('imageHeight', full.height); form.append('thumbnailWidth', thumb.width); form.append('thumbnailHeight', thumb.height);
        const created = await api('/api/admin/photos', { method: 'POST', body: form }); setPhotos((items) => [...items, { ...created, slug: created.slug }]);
        setPhotoFile(null); setPhotoName(''); e.target.reset();
      }); }}>
        <label className="admin-field">Photo name<input required maxLength={100} value={photoName} onChange={(e) => setPhotoName(e.target.value)} /></label>
        <label className="admin-field">Photo<input required type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} /><small>Optimized on this device before upload.</small></label>
        <ul className="admin-record-list">{photos.length ? photos.map((item) => <li className="admin-record" key={item.slug}><span>{item.name}</span><button className="admin-button" type="button" onClick={() => removeRecord('photos', item.slug, item.name)}>Remove</button>{statuses[`remove-photos-${item.slug}`] && <small>{statuses[`remove-photos-${item.slug}`]}</small>}</li>) : <li className="admin-status">No photos saved.</li>}</ul>
      </AdminForm>
      <section className="admin-card admin-messages"><h2>Visitor messages <span>({messages.length})</span></h2>{statuses.messages && <p>{statuses.messages}</p>}{messages.length ? messages.map((message) => <article className="visitor-message" key={message.id}><header><strong>{message.name || 'Anonymous'}</strong><time>{new Date(message.createdAt).toLocaleString()}</time></header><p>{message.message}</p></article>) : <p>No messages yet.</p>}</section>
    </section>
    {showSectionModal && <div className="section-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSectionModal(false); }}>
      <form className="admin-card section-modal" role="dialog" aria-modal="true" aria-labelledby="new-section-heading" onSubmit={(event) => {
        event.preventDefault(); action('new-section', async () => {
          const created = await api('/api/admin/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newSectionName }) });
          setSections((items) => [...items, created].sort((a, b) => a.order - b.order)); setShowSectionModal(false); setNewSectionName('');
        });
      }}>
        <h2 id="new-section-heading">Add section</h2>
        <label className="admin-field">Section name<input autoFocus required maxLength={60} value={newSectionName} onChange={(event) => setNewSectionName(event.target.value)} /></label>
        <div className="admin-modal-actions"><button className="admin-button" type="submit">Save</button><button className="admin-button" type="button" onClick={() => setShowSectionModal(false)}>Cancel</button></div>
        {statuses['new-section'] && <p className="admin-status" role="status">{statuses['new-section']}</p>}
      </form>
    </div>}
  </main>;
}
