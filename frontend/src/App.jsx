import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar.jsx';
import HomePage from './pages/HomePage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

let publicVisitRecorded = false;

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [content, setContent] = useState(null);
  const isAdmin = window.location.pathname.replace(/\/$/, '') === '/admin';
  useEffect(() => {
    fetch('/api/content').then((r) => r.ok ? r.json() : Promise.reject(new Error('Could not load website content.'))).then(setContent).catch(() => {});
  }, []);
  useEffect(() => {
    if (isAdmin || publicVisitRecorded) return;
    publicVisitRecorded = true;
    fetch('/api/visits', { method: 'POST', keepalive: true }).catch(() => {});
  }, [isAdmin]);
  const connectTitle = content?.sections?.find((section) => section.key === 'connect')?.title || 'Connect';
  const openConnect = () => {
    const section = document.getElementById('connect');
    if (section instanceof HTMLDetailsElement) section.open = true;
  };

  return (
    <div className={`app-shell ${isAdmin ? 'admin-shell' : ''}`}>
      <header className="topbar">
        {isAdmin ? <a className="brand" href="/" aria-label="YAXH home">YAXH</a> : <a className="brand" href="/" aria-label="Toggle sidebar" aria-expanded={sidebarOpen} aria-controls="site-navigation" onClick={(event) => { event.preventDefault(); setSidebarOpen((value) => !value); }}>YAXH</a>}
        {!isAdmin && <a className="brand connect-quick-link" href="#connect" onClick={openConnect}>{connectTitle}</a>}
      </header>
      {isAdmin ? <AdminDashboard /> : (
        <div className="site-layout">
          <Sidebar sidebarOpen={sidebarOpen} onCloseMobile={() => { if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen(false); }} content={content} />
          <main className="main-content" aria-label="Main content"><HomePage content={content} /></main>
        </div>
      )}
    </div>
  );
}
