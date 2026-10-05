import { useEffect, useState } from 'react';
import { apiUrl } from '../api.js';

function CICDTestBadge() {
  return <div className="eyebrow" style={{ marginBottom: '1rem' }}>Updated Oct 5, 2026 · CI/CD test #2</div>;
}

function ConnectForm() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('Sending...');
    try {
      const response = await fetch(apiUrl('/api/messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Could not send your message. Please try again.');
      }
      setName('');
      setMessage('');
      setStatus(result.emailSent
        ? 'Message sent. Thank you!'
        : 'Message saved, but the email notification could not be sent.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <div className="connect-content">
      <form className="connect-form" onSubmit={handleSubmit}>
        <label className="connect-field">
          <span>Name <span className="optional-label">(optional)</span></span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="name" />
        </label>
        <label className="connect-field">
          <span>Message</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={5000} rows={5} />
        </label>
        <button className="brand connect-submit" type="submit">Send</button>
        <p className="form-status" role="status" aria-live="polite">{status}</p>
      </form>
      <div className="connect-links">
        <a href="https://mail.google.com/mail/?view=cm&fs=1&to=bhoomkar04%40gmail.com" target="_blank" rel="noreferrer">Send me an email!</a>
        <a href="https://www.instagram.com/yaxh.ssh" target="_blank" rel="noreferrer">Connect to my private Instagram account</a>
      </div>
    </div>
  );
}

function PlaylistEmbed({ playlist }) {
  return (
    <section className="content-subsection" id={playlist.slug} aria-labelledby={`${playlist.slug}-title`}>
      <h2 className="content-subsection-title" id={`${playlist.slug}-title`}>{playlist.title}</h2>
      <div className="playlist-page">
        <iframe
          className="spotify-player"
          data-testid="embed-iframe"
          title={`${playlist.title} Spotify playlist`}
          src={playlist.embedUrl}
          width="100%"
          height="352"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </section>
  );
}

function CarsGallery({ cars }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (!selectedPhoto) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedPhoto(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedPhoto]);

  return (
    <>
      <div className="cars-gallery">
        {cars.map((car) => (
          <button
            className="car-photo-button"
            key={car.slug}
            type="button"
            onClick={() => setSelectedPhoto(car)}
            aria-label={`Open ${car.name} photo`}
          >
            <img
              className="car-thumbnail"
              src={apiUrl(car.thumbnailUrl)}
              alt={car.name}
              width={car.thumbnailWidth}
              height={car.thumbnailHeight}
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>

      {selectedPhoto && (
        <div
          className="photo-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={selectedPhoto.name}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedPhoto(null);
          }}
        >
          <button
            className="photo-viewer-close"
            type="button"
            aria-label="Close photo"
            onClick={() => setSelectedPhoto(null)}
          >×</button>
          <img
            className="photo-viewer-image"
            src={apiUrl(selectedPhoto.fullUrl)}
            alt={selectedPhoto.name}
            width={selectedPhoto.fullWidth}
            height={selectedPhoto.fullHeight}
            decoding="async"
          />
        </div>
      )}
    </>
  );
}

function LoadingContent({ error }) {
  return <p className={error ? 'content-error' : 'content-loading'} role={error ? 'alert' : 'status'}>
    {error || 'Loading...'}
  </p>;
}

export default function HomePage({ content }) {
  const [error, setError] = useState('');
  useEffect(() => { if (!content) setError('Could not load website content.'); else setError(''); }, [content]);
  const sectionTitle = (key, fallback) => content?.sections?.find((section) => section.key === key)?.title || fallback;

  return (
    <div className="single-page-content">
      <CICDTestBadge />
      <details className="content-section" id="songs-on-loop">
        <summary className="content-section-heading">
          <h1 className="content-section-title">{sectionTitle('songs-on-loop', 'Songs On Loop')}</h1>
          <span className="section-caret" aria-hidden="true">⌃</span>
        </summary>
        <div className="content-section-body">
          {content
            ? content.playlists.map((playlist) => <PlaylistEmbed key={playlist.slug} playlist={playlist} />)
            : <LoadingContent error={error} />}
        </div>
      </details>

      <details className="content-section" id="clicks">
        <summary className="content-section-heading">
          <h1 className="content-section-title">{sectionTitle('clicks', 'Clicks')}</h1>
          <span className="section-caret" aria-hidden="true">⌃</span>
        </summary>
        <div className="content-section-body">
          {content ? <CarsGallery cars={content.cars} /> : <LoadingContent error={error} />}
        </div>
      </details>

      <details className="content-section" id="dialogues">
        <summary className="content-section-heading">
          <h1 className="content-section-title">{sectionTitle('dialogues', 'Dialogues')}</h1>
          <span className="section-caret" aria-hidden="true">⌃</span>
        </summary>
        <div className="content-section-body dialogues-page">
          {content
            ? content.dialogues.map((dialogue, index) => (
              <blockquote className="movie-dialogue" key={dialogue.id}>
                <span className="dialogue-number">{String(index + 1).padStart(2, '0')}</span>
                <p>{dialogue.text}</p>
              </blockquote>
            ))
            : <LoadingContent error={error} />}
        </div>
      </details>

      <details className="content-section" id="connect">
        <summary className="content-section-heading">
          <h1 className="content-section-title">{sectionTitle('connect', 'Connect')}</h1>
          <span className="section-caret" aria-hidden="true">⌃</span>
        </summary>
        <div className="content-section-body"><ConnectForm /></div>
      </details>

      <details className="content-section" id="links">
        <summary className="content-section-heading">
          <h1 className="content-section-title">{sectionTitle('links', 'Links')}</h1>
          <span className="section-caret" aria-hidden="true">⌃</span>
        </summary>
        <div className="content-section-body">
          <div className="page-links">
            <a href="https://www.instagram.com/yaxh.cpp" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://www.linkedin.com/in/yash-bhoomkar-7aa460213/" target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </div>
      </details>
      {content?.sections?.filter((section) => !['songs-on-loop', 'clicks', 'dialogues', 'connect', 'links'].includes(section.key)).map((section) => (
        <details className="content-section" id={section.key} key={section.key}>
          <summary className="content-section-heading">
            <h1 className="content-section-title">{section.title}</h1>
            <span className="section-caret" aria-hidden="true">⌃</span>
          </summary>
          <div className="content-section-body" />
        </details>
      ))}
    </div>
  );
}
