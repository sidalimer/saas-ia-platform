import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, FormEvent } from 'react';

const API_URL = '/api';

// ── Auth Context ──────────────────────────────────────────────
function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setUser(data); else logout(); })
        .catch(() => logout());
    }
  }, [token]);

  function login(t: string, rt: string, u: any) {
    localStorage.setItem('token', t);
    localStorage.setItem('refreshToken', rt);
    setToken(t);
    setUser(u);
  }
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  }
  function updateUser(u: any) { setUser(u); }
  return { user, token, login, logout, updateUser, isAuth: !!token };
}

// ── Pages ─────────────────────────────────────────────────────
function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">AI-Powered</span>
          <span className="block text-indigo-600">SaaS Platform</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
          Harness the power of artificial intelligence with our scalable, secure, and modern platform.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link to="/register" className="rounded-xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-indigo-700 transition-all">
            Get Started
          </Link>
          <Link to="/plans" className="rounded-xl border-2 border-gray-300 px-8 py-3 text-base font-semibold text-gray-700 hover:border-indigo-400 transition-all">
            View Plans
          </Link>
        </div>
      </div>
      <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'AI Chat', desc: 'Interact with AI through our intuitive chat interface.' },
          { title: 'Usage Tracking', desc: 'Real-time quota tracking and request history.' },
          { title: 'Secure Auth', desc: '2FA, JWT tokens, and enterprise-grade security.' },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
            <p className="mt-2 text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

function LoginPage({ onLogin }: { onLogin: (t: string, rt: string, u: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ...(totpRequired ? { totpCode } : {}) }),
    });
    const data = await res.json();
    if (res.status === 403 && data.totpRequired) {
      setTotpRequired(true);
      return;
    }
    if (!res.ok) { setError(data.error || 'Login failed'); return; }
    onLogin(data.accessToken, data.refreshToken, data.user);
    nav('/dashboard');
  }

  return (
    <div className="mx-auto max-w-md mt-20 px-4">
      <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" required />
        {totpRequired && (
          <div>
            <p className="text-sm text-amber-600 mb-2">🔐 Two-factor authentication required</p>
            <input type="text" placeholder="6-digit authenticator code" value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)} maxLength={6} autoFocus
              className="w-full rounded-lg border border-amber-300 px-4 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
          </div>
        )}
        <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700">
          {totpRequired ? 'Verify & Sign In' : 'Sign In'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">No account? <Link to="/register" className="text-indigo-600 hover:underline">Sign Up</Link></p>
      <p className="mt-2 text-center text-sm text-gray-500"><Link to="/forgot-password" className="text-indigo-600 hover:underline">Forgot password?</Link></p>
      <div className="mt-6">
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-gray-400">or continue with</span></div></div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <a href="/api/auth/oauth/google" className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </a>
          <a href="/api/auth/oauth/github" className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
          <a href="/api/auth/oauth/discord" className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.036.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            Discord
          </a>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ onLogin }: { onLogin: (t: string, rt: string, u: any) => void }) {
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const nav = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Registration failed'); return; }
    onLogin(data.accessToken, data.refreshToken, data.user);
    nav('/dashboard');
  }

  return (
    <div className="mx-auto max-w-md mt-20 px-4">
      <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
          <input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        </div>
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" required />
        <input type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" required minLength={8} />
        <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700">Create Account</button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Sign In</Link></p>
      <div className="mt-6">
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-gray-400">or sign up with</span></div></div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <a href="/api/auth/oauth/google" className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </a>
          <a href="/api/auth/oauth/github" className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
          <a href="/api/auth/oauth/discord" className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.036.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            Discord
          </a>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ user, token }: { user: any; token: string }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetch(`${API_URL}/db/subscriptions/user/${user.id}`, { headers: { 'x-internal-key': 'dev-internal-key-change-me' } })
        .then((r) => r.ok ? r.json() : null)
        .then(setStats)
        .catch(() => {});
    }
  }, [user, token]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <p className="text-sm text-gray-500">Welcome back</p>
          <p className="text-xl font-semibold mt-1">{user?.firstName || user?.email}</p>
          <p className="text-xs text-gray-400 mt-1">Role: {user?.role}</p>
        </div>
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <p className="text-sm text-gray-500">Current Plan</p>
          <p className="text-xl font-semibold mt-1">{stats?.plan?.name || 'Free'}</p>
          <p className="text-xs text-gray-400 mt-1">Status: {stats?.status || 'No subscription'}</p>
        </div>
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <p className="text-sm text-gray-500">AI Requests Used</p>
          <p className="text-xl font-semibold mt-1">{stats?.aiRequestsUsed || 0} / {stats?.plan?.aiRequestsLimit || 20}</p>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/chat" className="bg-indigo-50 rounded-xl border border-indigo-200 p-6 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-indigo-700">AI Chat</h3>
          <p className="text-sm text-gray-500 mt-1">Start a conversation with AI</p>
        </Link>
        <Link to="/plans" className="bg-green-50 rounded-xl border border-green-200 p-6 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-green-700">Upgrade Plan</h3>
          <p className="text-sm text-gray-500 mt-1">Get more AI requests and features</p>
        </Link>
        <Link to="/settings" className="bg-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-gray-700">Settings</h3>
          <p className="text-sm text-gray-500 mt-1">Edit profile and manage 2FA</p>
        </Link>
      </div>
    </div>
  );
}

function ChatPage({ user, token }: { user: any; token: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/ai/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, prompt: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response || data.error || 'Error' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error' }]);
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 flex flex-col h-[calc(100vh-80px)]">
      <h2 className="text-2xl font-bold mb-4">AI Chat</h2>
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border p-4 mb-4 space-y-4">
        {messages.length === 0 && <p className="text-gray-400 text-center mt-20">Send a message to start...</p>}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-xl px-4 py-2 ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              <p className="whitespace-pre-wrap text-sm">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-gray-100 rounded-xl px-4 py-2 text-sm text-gray-500 animate-pulse">Thinking...</div></div>}
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..."
          className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        <button type="submit" disabled={loading} className="rounded-xl bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700 disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}

function PlansPage({ user, token }: { user: any; token: string | null }) {
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/db/plans`).then((r) => r.json()).then(setPlans).catch(() => {});
  }, []);

  async function subscribe(planId: string) {
    if (!user || !token) return;
    await fetch(`${API_URL}/payments/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: user.id, planId, interval: 'MONTHLY' }),
    });
    alert('Subscribed! (mock payment)');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Plans & Pricing</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p: any) => (
          <div key={p.id} className="bg-white rounded-xl border p-6 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold">{p.name}</h3>
            <p className="text-gray-500 text-sm mt-1">{p.description}</p>
            <p className="text-3xl font-bold mt-4">{p.monthlyPrice === 0 ? 'Free' : `${(p.monthlyPrice / 100).toFixed(0)}€`}<span className="text-sm text-gray-400 font-normal">/mo</span></p>
            <ul className="mt-4 space-y-2 flex-1">
              {JSON.parse(p.features || '[]').map((f: string) => (
                <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-green-500">&#10003;</span> {f}
                </li>
              ))}
            </ul>
            {user && <button onClick={() => subscribe(p.id)} className="mt-6 w-full rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700">Subscribe</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage({ user, token, onUpdate }: { user: any; token: string; onUpdate: (u: any) => void }) {
  const [tab, setTab] = useState<'profile' | 'security'>('profile');
  const [profile, setProfile] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [qr, setQr] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpMsg, setTotpMsg] = useState('');

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API_URL}/db/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': 'dev-internal-key-change-me' },
      body: JSON.stringify(profile),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate(updated);
      setProfileMsg('Profile updated!');
    } else {
      setProfileMsg('Update failed');
    }
    setTimeout(() => setProfileMsg(''), 3000);
  }

  async function setupTotp() {
    const res = await fetch(`${API_URL}/auth/totp/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      setQr(data.qrCodeUrl);
    }
  }

  async function verifyTotp(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`${API_URL}/auth/totp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: totpCode }),
    });
    const data = await res.json();
    if (res.ok) {
      setTotpMsg('2FA enabled!');
      setQr('');
      onUpdate({ ...user, totpEnabled: true });
    } else {
      setTotpMsg(data.error || 'Verification failed');
    }
    setTimeout(() => setTotpMsg(''), 3000);
  }

  async function disableTotp() {
    const res = await fetch(`${API_URL}/auth/totp/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      setTotpMsg('2FA disabled.');
      onUpdate({ ...user, totpEnabled: false });
    }
    setTimeout(() => setTotpMsg(''), 3000);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['profile', 'security'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={user?.email} disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-400 cursor-not-allowed" />
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" className="rounded-lg bg-indigo-600 px-6 py-2 text-white font-medium hover:bg-indigo-700">Save Changes</button>
            {profileMsg && <span className={`text-sm ${profileMsg.includes('failed') ? 'text-red-500' : 'text-green-600'}`}>{profileMsg}</span>}
          </div>
        </form>
      )}

      {tab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Status: <span className={user?.totpEnabled ? 'text-green-600 font-medium' : 'text-gray-400'}>
                    {user?.totpEnabled ? 'Enabled ✓' : 'Disabled'}
                  </span>
                </p>
              </div>
              {user?.totpEnabled ? (
                <button onClick={disableTotp} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50">Disable 2FA</button>
              ) : (
                <button type="button" onClick={setupTotp} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">Enable 2FA</button>
              )}
            </div>
            {qr && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-600">Scan this QR code with your authenticator app (Google Authenticator, Authy…):</p>
                <img src={qr} alt="TOTP QR Code" className="w-48 h-48 border rounded-lg" />
                <form onSubmit={verifyTotp} className="flex gap-2">
                  <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="Enter 6-digit code" maxLength={6}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                  <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">Verify & Activate</button>
                </form>
              </div>
            )}
            {totpMsg && <p className={`text-sm mt-2 ${totpMsg.includes('failed') ? 'text-red-500' : 'text-green-600'}`}>{totpMsg}</p>}
          </div>
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900">Account Info</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd className="font-medium">{user?.role}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Email Verified</dt><dd className={user?.emailVerified ? 'text-green-600 font-medium' : 'text-gray-400'}>{user?.emailVerified ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Member Since</dt><dd className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ForgotPasswordPage (multi-step: email → code → new password) ──────
function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [channel, setChannel] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const nav = useNavigate();

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setChannel(data.channel || 'email');
    setStep('code');
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Invalid code'); return; }
    setDone(true);
    setTimeout(() => nav('/login'), 2000);
  }

  return (
    <div className="mx-auto max-w-md mt-20 px-4">
      <h2 className="text-2xl font-bold text-center mb-2">Forgot Password</h2>
      {done ? (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center">✓ Password updated! Redirecting...</div>
      ) : step === 'email' ? (
        <>
          <p className="text-center text-gray-500 text-sm mb-6">Enter your email to receive a 6-digit reset code.</p>
          <form onSubmit={handleSendCode} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" required />
            <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700">Send Code</button>
          </form>
        </>
      ) : (
        <>
          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm text-center mb-4">
            {channel === 'sms' ? '📱 Code sent to your phone' : '📧 Code sent to your email'}. Enter it below.
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleReset} className="space-y-4">
            <input type="text" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)}
              maxLength={6} className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl tracking-widest focus:border-indigo-500" required />
            <input type="password" placeholder="New password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500" required minLength={8} />
            <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500" required />
            <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700">Reset Password</button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-sm text-gray-500 hover:text-indigo-600">Resend code</button>
          </form>
        </>
      )}
      <p className="mt-4 text-center text-sm text-gray-500"><Link to="/login" className="text-indigo-600 hover:underline">Back to Sign In</Link></p>
    </div>
  );
}

// ── ResetPasswordPage ──────────────────────────────────────────
// Redirect to the unified forgot-password flow
function ResetPasswordPage() {
  const nav = useNavigate();
  useEffect(() => { nav('/forgot-password', { replace: true }); }, []);
  return <div className="mx-auto max-w-md mt-20 px-4 text-center text-gray-500">Redirecting...</div>;
}

// ── VerifyEmailPage ────────────────────────────────────────────
function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [msg, setMsg] = useState('');
  const token = new URLSearchParams(window.location.search).get('token') || '';

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('No token provided.'); return; }
    fetch(`${API_URL}/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.message) { setStatus('success'); setMsg(data.message); }
        else { setStatus('error'); setMsg(data.error || 'Verification failed'); }
      })
      .catch(() => { setStatus('error'); setMsg('Verification failed'); });
  }, [token]);

  return (
    <div className="mx-auto max-w-md mt-20 px-4 text-center">
      {status === 'loading' && <p className="text-gray-500">Verifying...</p>}
      {status === 'success' && (
        <div className="bg-green-50 text-green-700 p-6 rounded-xl">
          <p className="text-2xl mb-2">✓</p>
          <p className="font-semibold">{msg}</p>
          <Link to="/login" className="mt-4 inline-block text-indigo-600 hover:underline text-sm">Go to Sign In</Link>
        </div>
      )}
      {status === 'error' && (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl">
          <p className="font-semibold">{msg}</p>
          <Link to="/login" className="mt-4 inline-block text-indigo-600 hover:underline text-sm">Go to Sign In</Link>
        </div>
      )}
    </div>
  );
}

// ── OAuthCallbackPage ──────────────────────────────────────────
function OAuthCallbackPage({ onLogin }: { onLogin: (t: string, rt: string, u: any) => void }) {
  const nav = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');

    if (error || !accessToken || !refreshToken) {
      nav(`/login?error=${error || 'oauth_failed'}`);
      return;
    }

    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((user) => {
        onLogin(accessToken, refreshToken, user);
        nav('/dashboard');
      })
      .catch(() => nav('/login?error=oauth_failed'));
  }, []);

  return (
    <div className="mx-auto max-w-md mt-20 px-4 text-center">
      <p className="text-gray-500 animate-pulse">Completing sign in...</p>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
function App() {
  const auth = useAuth();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <Link to="/" className="text-2xl font-bold text-indigo-600">SaaS IA</Link>
              <nav className="flex items-center gap-4">
                {auth.isAuth ? (
                  <>
                    <Link to="/dashboard" className="text-sm text-gray-600 hover:text-indigo-600">Dashboard</Link>
                    <Link to="/chat" className="text-sm text-gray-600 hover:text-indigo-600">AI Chat</Link>
                    <Link to="/plans" className="text-sm text-gray-600 hover:text-indigo-600">Plans</Link>
                    <Link to="/settings" className="text-sm text-gray-600 hover:text-indigo-600">Settings</Link>
                    <button onClick={auth.logout} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Sign In</Link>
                    <Link to="/register" className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50">Sign Up</Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={auth.isAuth ? <Navigate to="/dashboard" /> : <LoginPage onLogin={auth.login} />} />
          <Route path="/register" element={auth.isAuth ? <Navigate to="/dashboard" /> : <RegisterPage onLogin={auth.login} />} />
          <Route path="/dashboard" element={auth.isAuth ? <DashboardPage user={auth.user} token={auth.token!} /> : <Navigate to="/login" />} />
          <Route path="/chat" element={auth.isAuth ? <ChatPage user={auth.user} token={auth.token!} /> : <Navigate to="/login" />} />
          <Route path="/plans" element={<PlansPage user={auth.user} token={auth.token} />} />
          <Route path="/settings" element={auth.isAuth ? <SettingsPage user={auth.user} token={auth.token!} onUpdate={auth.updateUser} /> : <Navigate to="/login" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage onLogin={auth.login} />} />
        </Routes>

        <footer className="border-t border-gray-200 bg-white mt-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-gray-400">
            SaaS IA Platform &copy; 2024
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
