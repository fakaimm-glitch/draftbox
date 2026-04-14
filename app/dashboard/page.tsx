'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

type Post = {
  id: string;
  content: string;
  status: 'DRAFT' | 'READY' | 'PUBLISHED';
  createdAt: string;
  media: { id: string; url: string; type: string }[];
};

const PLATFORMS = [
  { id: 'x',        name: 'X',        color: '#000',    buildUrl: (t: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}` },
  { id: 'linkedin', name: 'LinkedIn', color: '#0077b5', buildUrl: (t: string) => `https://www.linkedin.com/shareArticle?mini=true&summary=${encodeURIComponent(t)}` },
  { id: 'threads',  name: 'Threads',  color: '#101010', buildUrl: (t: string) => `https://www.threads.net/intent/post?text=${encodeURIComponent(t)}` },
  { id: 'facebook', name: 'Facebook', color: '#1877f2', buildUrl: (t: string) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(t)}` },
];

function Avatar({ name, size = 38 }: { name?: string | null; size?: number }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#1d9bf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: 'white', flexShrink: 0, userSelect: 'none' }}>
      {initials}
    </div>
  );
}

function formatTime(date: string) {
  const d   = new Date(date);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60)    return `${sec}s`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [posts,            setPosts]           = useState<Post[]>([]);
  const [tab,              setTab]             = useState<'home' | 'drafts' | 'settings'>('home');
  const [composerOpen,     setComposerOpen]    = useState(false);
  const [composeText,      setComposeText]     = useState('');
  const [mediaFiles,       setMediaFiles]      = useState<File[]>([]);
  const [publishPost,      setPublishPost]     = useState<Post | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [loading,          setLoading]         = useState(false);
  const [editingPost,      setEditingPost]     = useState<Post | null>(null);
  const [profileMenuOpen,  setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') fetchPosts();
  }, [status]);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchPosts() {
    const res  = await fetch('/api/posts');
    const data = await res.json();
    if (data.posts) setPosts(data.posts);
  }

  async function savePost() {
    if (!composeText.trim()) return;
    setLoading(true);

    let uploadedMedia: { url: string; publicId: string; type: 'IMAGE' | 'VIDEO' }[] = [];

    for (const file of mediaFiles) {
      const formData = new FormData();
      formData.append('file', file);
      const res  = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        uploadedMedia.push({ url: data.url, publicId: data.publicId, type: data.type });
      }
    }

    if (editingPost) {
      await fetch(`/api/posts/${editingPost.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: composeText, status: 'DRAFT' }),
      });
      setEditingPost(null);
    } else {
      await fetch('/api/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: composeText, status: 'DRAFT', media: uploadedMedia }),
      });
    }

    setComposeText('');
    setMediaFiles([]);
    setComposerOpen(false);
    setLoading(false);
    fetchPosts();
  }

  async function markReady(post: Post) {
    await fetch(`/api/posts/${post.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: post.status === 'READY' ? 'DRAFT' : 'READY' }),
    });
    fetchPosts();
  }

  async function deletePost(id: string) {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    fetchPosts();
  }

  function editPost(post: Post) {
    setEditingPost(post);
    setComposeText(post.content);
    setComposerOpen(true);
    setTab('home');
  }

  function openPublish(post: Post) {
    setPublishPost(post);
    setSelectedPlatform('');
  }

  function doPublish() {
    if (!publishPost || !selectedPlatform) return;
    const p = PLATFORMS.find(p => p.id === selectedPlatform);
    if (p) window.open(p.buildUrl(publishPost.content), '_blank');
    setPublishPost(null);
  }

  function openComposer() {
    setComposerOpen(true);
    setTab('home');
  }

  const displayPosts = tab === 'drafts'
    ? posts.filter(p => p.status === 'DRAFT')
    : posts;

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#71767b' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', maxWidth: 600, margin: '0 auto', position: 'relative' }}>

      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2f3336', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, background: '#1d9bf0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#e7e9ea' }}>Draftbox</span>
        </div>

        {/* Profile icon with dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setProfileMenuOpen(prev => !prev)}
            style={{ cursor: 'pointer' }}
          >
            <Avatar name={session?.user?.name} />
          </div>

          {profileMenuOpen && (
            <div style={{ position: 'absolute', top: 46, right: 0, background: '#16181c', border: '1px solid #2f3336', borderRadius: 16, padding: 12, minWidth: 220, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              {/* User info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px 12px', borderBottom: '1px solid #2f3336', marginBottom: 8 }}>
                <Avatar name={session?.user?.name} size={40} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#e7e9ea', margin: 0 }}>{session?.user?.name}</p>
                  <p style={{ fontSize: 12, color: '#71767b', margin: 0 }}>{session?.user?.email}</p>
                </div>
              </div>

              {/* Sign out */}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ width: '100%', background: 'none', border: 'none', padding: '10px 8px', color: '#f4212e', fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'left', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#f4212e">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feed header */}
      <div style={{ padding: '12px 16px 0', borderBottom: '1px solid #2f3336' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#e7e9ea', marginBottom: 12 }}>
          {tab === 'home' ? 'Your posts' : tab === 'drafts' ? 'Drafts' : 'Settings'}
        </h1>
      </div>

      {/* Composer */}
      {composerOpen && tab === 'home' && (
        <div style={{ borderBottom: '1px solid #2f3336', padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <Avatar name={session?.user?.name} />
            <div style={{ flex: 1 }}>
              <textarea
                autoFocus
                value={composeText}
                onChange={e => setComposeText(e.target.value)}
                placeholder="What's on your mind? Draft your next post..."
                maxLength={2000}
                rows={4}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#e7e9ea', fontSize: 16, resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
              />

              {/* Media previews */}
              {mediaFiles.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {mediaFiles.map((f, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img
                        src={URL.createObjectURL(f)}
                        alt="preview"
                        style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #2f3336' }}
                      />
                      <button
                        onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#f4212e', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #2f3336' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {/* Image/Video upload */}
                  <label style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files ?? []);
                        setMediaFiles(prev => [...prev, ...files].slice(0, 4));
                      }}
                    />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1d9bf0">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: composeText.length > 1800 ? '#f4212e' : '#71767b' }}>
                    {2000 - composeText.length}
                  </span>
                  <button
                    onClick={() => { setComposerOpen(false); setComposeText(''); setEditingPost(null); setMediaFiles([]); }}
                    style={{ background: 'none', border: '1px solid #2f3336', borderRadius: 20, padding: '6px 14px', color: '#e7e9ea', fontSize: 13, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePost}
                    disabled={loading || !composeText.trim()}
                    style={{ background: '#1d9bf0', border: 'none', borderRadius: 20, padding: '6px 16px', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !composeText.trim() ? 0.5 : 1 }}
                  >
                    {loading ? 'Saving...' : editingPost ? 'Update' : 'Save draft'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts feed */}
      <div style={{ flex: 1, paddingBottom: 80 }}>
        {tab === 'settings' ? (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #2f3336' }}>
              <Avatar name={session?.user?.name} size={56} />
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#e7e9ea' }}>{session?.user?.name}</p>
                <p style={{ fontSize: 14, color: '#71767b' }}>{session?.user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{ width: '100%', background: 'none', border: '1px solid #f4212e', borderRadius: 20, padding: '10px 16px', color: '#f4212e', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        ) : displayPosts.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ color: '#71767b', fontSize: 15 }}>No posts yet. Tap + to create your first draft!</p>
          </div>
        ) : (
          displayPosts.map(post => (
            <div key={post.id} style={{ padding: '14px 16px', borderBottom: '1px solid #2f3336', display: 'flex', gap: 10 }}>
              <Avatar name={session?.user?.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#e7e9ea' }}>{session?.user?.name}</span>
                  <span style={{ fontSize: 13, color: '#71767b' }}>· {formatTime(post.createdAt)}</span>
                </div>
                <p style={{ fontSize: 15, color: '#e7e9ea', lineHeight: 1.6, marginBottom: 10, wordBreak: 'break-word' }}>{post.content}</p>

                {/* Media thumbnails */}
                {post.media && post.media.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    {post.media.map(m => (
                      <img
                        key={m.id}
                        src={m.url}
                        alt="media"
                        style={{ width: 100, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #2f3336' }}
                      />
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => markReady(post)}
                    style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600, cursor: 'pointer', border: post.status === 'READY' ? '1px solid #00ba7c' : '1px solid #2f3336', background: post.status === 'READY' ? '#051e11' : '#16181c', color: post.status === 'READY' ? '#00ba7c' : '#71767b' }}
                  >
                    {post.status === 'READY' ? 'Ready' : 'Draft'}
                  </button>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => editPost(post)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #2f3336', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#71767b"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button onClick={() => deletePost(post.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #2f3336', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#71767b"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                    <button onClick={() => openPublish(post)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #1d9bf0', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      {tab !== 'settings' && (
        <button
          onClick={openComposer}
         style={{ position: 'fixed', bottom: 72, right: 16, width: 52, height: 52, borderRadius: '50%', background: '#1d9bf0', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(29,155,240,0.45)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </button>
      )}

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 600, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2f3336', display: 'flex', zIndex: 30 }}>
        {[
          { key: 'home',     label: 'Home',     icon: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/> },
          { key: 'drafts',   label: 'Drafts',   icon: <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/> },
          { key: 'settings', label: 'Settings', icon: <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/> },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as any)}
            style={{ flex: 1, background: 'none', border: 'none', padding: '10px 0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={tab === item.key ? '#e7e9ea' : '#71767b'}>{item.icon}</svg>
            <span style={{ fontSize: 10, color: tab === item.key ? '#e7e9ea' : '#71767b' }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Publish modal */}
      {publishPost && (
        <div
          onClick={() => setPublishPost(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#16181c', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', width: '100%', maxWidth: 600, borderTop: '1px solid #2f3336' }}
          >
            <div style={{ width: 36, height: 4, background: '#2f3336', borderRadius: 2, margin: '0 auto 16px' }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#e7e9ea', marginBottom: 4 }}>Post to...</p>
            <p style={{ fontSize: 13, color: '#71767b', marginBottom: 16 }}>Choose your platform</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  style={{ background: '#000', border: selectedPlatform === p.id ? '2px solid #1d9bf0' : '1px solid #2f3336', borderRadius: 12, padding: '12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                >
                  <div style={{ width: 34, height: 34, background: p.color, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: p.id === 'x' || p.id === 'threads' ? '1px solid #2f3336' : 'none' }}>
                    {p.id === 'x'        && <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                    {p.id === 'linkedin' && <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>}
                    {p.id === 'threads'  && <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.363-.89h-.074c-.83 0-1.999.202-2.738 1.121-.342.335-.646.836-.646 1.8H6.466c0-1.42.492-2.541 1.46-3.435 1.044-.966 2.44-1.365 3.93-1.365h.107c1.672.013 3.01.513 3.972 1.49 1.09 1.108 1.564 2.735 1.4 4.686a8.556 8.556 0 0 1 2.007 1.723c.8.918 1.336 2.104 1.6 3.487a7.877 7.877 0 0 1-.147 3.734c-.418 1.455-1.27 2.698-2.495 3.62-1.446 1.082-3.25 1.64-5.43 1.655z"/></svg>}
                    {p.id === 'facebook' && <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e7e9ea' }}>{p.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={doPublish}
              disabled={!selectedPlatform}
              style={{ width: '100%', background: selectedPlatform ? '#1d9bf0' : '#16181c', border: 'none', borderRadius: 20, padding: '12px', color: selectedPlatform ? 'white' : '#71767b', fontSize: 15, fontWeight: 700, cursor: selectedPlatform ? 'pointer' : 'default' }}
            >
              {selectedPlatform ? `Open ${PLATFORMS.find(p => p.id === selectedPlatform)?.name}` : 'Select a platform'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}