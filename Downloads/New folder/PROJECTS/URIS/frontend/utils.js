// src/utils/starfield.js
// Injects an animated canvas star-field matching STEMONEF's background aesthetic

export function initStarfield() {
  const canvas = document.createElement('canvas');
  canvas.id = 'starfield';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let stars = [];
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createStars(n = 180) {
    stars = Array.from({ length: n }, () => ({
      x:    Math.random() * W,
      y:    Math.random() * H,
      r:    Math.random() * 1.2 + 0.2,
      a:    Math.random(),
      da:   (Math.random() - 0.5) * 0.004,
      dx:   (Math.random() - 0.5) * 0.04,
      dy:   (Math.random() - 0.5) * 0.04,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.x += s.dx; s.y += s.dy; s.a += s.da;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
      if (s.a < 0.1) s.da = Math.abs(s.da);
      if (s.a > 0.9) s.da = -Math.abs(s.da);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,184,232,${s.a * 0.7})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  createStars();
  draw();
  window.addEventListener('resize', () => { resize(); createStars(); });
}


// src/utils/api.js
export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export function authHeaders() {
  const token = localStorage.getItem('uris_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Request failed');
  return data;
}

export function saveToken(token) { localStorage.setItem('uris_token', token); }
export function getToken()       { return localStorage.getItem('uris_token'); }
export function clearToken()     { localStorage.removeItem('uris_token'); }

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return 'just now';
}
