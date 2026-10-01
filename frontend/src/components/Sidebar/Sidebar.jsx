import './Sidebar.css';
import { itemIcons } from './itemIcons.js';

const sections = [
  {
    key: 'songs-on-loop', title: 'Songs On Loop',
    items: [
      ['On Loop', '#on-loop'],
      ['Millionaire', '#millionaire'],
    ],
  },
  { key: 'clicks', title: 'Clicks', items: [['Gallery', '#clicks']] },
  { key: 'dialogues', title: 'Dialogues', items: [['Movie Dialogues', '#dialogues']] },
  { key: 'connect', title: 'Connect', items: [] },
  {
    key: 'links', title: 'Links',
    items: [
      ['Instagram', 'https://www.instagram.com/yaxh.cpp'],
      ['LinkedIn', 'https://www.linkedin.com/in/yash-bhoomkar-7aa460213/'],
    ],
  },
];

function Chevron({ open }) {
  return (
    <svg className={`chevron ${open ? 'is-open' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function FolderIcon({ open }) {
  return (
    <svg className="folder-icon" viewBox="0 0 24 24" aria-hidden="true">
      {open ? (
        <path d="M10.4 3H2v17h20V6H12.4L10.4 3Z" />
      ) : (
        <path d="M2.75 3.75v15.5h18.5V6.75H12l-2-3H2.75Z" />
      )}
    </svg>
  );
}

function Section({ title, keyName, items, onNavigate }) {
  const sectionId = keyName;

  return (
    <details className="sidebar-section" open>
      <summary
        className="section-heading"
        onClick={() => {
          const target = document.getElementById(sectionId);
          if (target instanceof HTMLDetailsElement) target.open = true;
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          onNavigate();
        }}
      >
        <Chevron open />
        <FolderIcon open />
        <span>{title}</span>
      </summary>
      <ul className="section-items">
        {items.map(([label, href]) => (
          <li key={label}>
            <a
              className="sidebar-link"
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noreferrer' : undefined}
              onClick={(event) => {
                if (href.startsWith('#')) {
                  const target = document.querySelector(href);
                  target?.closest('details.content-section')?.setAttribute('open', '');
                }
                onNavigate();
              }}
            >
              {itemIcons[label] ? (
                <svg className="item-icon" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: itemIcons[label] }} />
              ) : <span className="item-icon external-icon" aria-hidden="true">{href.startsWith('http') ? '↗' : '♪'}</span>}
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function Sidebar({ sidebarOpen, content, onCloseMobile }) {

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`} aria-label="Site navigation">
      <div className="brand-row"><a className="brand-social" href="https://www.instagram.com/yaxh.cpp" target="_blank" rel="noreferrer">[Yaxh.cpp]</a></div>
      <nav id="site-navigation">
        {(content?.sections || sections).map((section) => {
          const defaultSection = sections.find((item) => item.key === section.key);
          return <Section key={section.key} keyName={section.key} title={section.title} items={defaultSection?.items || []} onNavigate={onCloseMobile} />;
        })}
      </nav>
    </aside>
  );
}
