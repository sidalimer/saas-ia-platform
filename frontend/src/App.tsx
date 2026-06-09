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
