import React, { useState } from 'react';
import { Lock, Mail, X } from 'lucide-react';
import { AuthSessionResponse } from '../adminTypes';
import { loginUser, registerUser } from '../utils/authApi';

interface AuthModalProps {
  onClose: () => void;
  onAuthenticated: (session: AuthSessionResponse) => void;
  databaseConfigured: boolean;
  initialMode?: 'login' | 'register';
}

function hasLocalVerificationUrl(
  session: AuthSessionResponse
): session is AuthSessionResponse & { verificationUrl: string; emailSent?: boolean } {
  return 'verificationUrl' in session && typeof session.verificationUrl === 'string' && session.verificationUrl.length > 0;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onAuthenticated,
  databaseConfigured,
  initialMode = 'register'
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setVerificationUrl(null);
    setLoading(true);

    try {
      const session = mode === 'register'
        ? await registerUser(email.trim(), password, name.trim())
        : await loginUser(email.trim(), password);
      onAuthenticated(session);
      if (hasLocalVerificationUrl(session) && session.emailSent === false) {
        setVerificationUrl(session.verificationUrl);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg border border-white/12 bg-[#0d1410] p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-black text-white">Player account</h2>
            <p className="mt-1 text-xs text-white/50">Sign in to unlock weekly access and save your player identity.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close account modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!databaseConfigured && (
          <div className="mt-4 rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3 text-xs text-yellow-100">
            Add `DATABASE_URL` to enable real player accounts locally.
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 rounded-lg border border-white/10 bg-white/5 p-1">
          {(['register', 'login'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={`h-9 rounded-md text-xs font-black capitalize ${
                mode === item ? 'bg-[#00e676] text-black' : 'text-white/55 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === 'register' && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-white/45">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#141c17] px-3 text-sm text-white outline-none focus:border-[#00e676]"
                placeholder="Player name"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-white/45">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                className="h-11 w-full rounded-lg border border-white/10 bg-[#141c17] pl-10 pr-3 text-sm text-white outline-none focus:border-[#00e676]"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-white/45">Password</span>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                minLength={8}
                required
                className="h-11 w-full rounded-lg border border-white/10 bg-[#141c17] pl-10 pr-3 text-sm text-white outline-none focus:border-[#00e676]"
                placeholder="At least 8 characters"
              />
            </div>
          </label>

          {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-xs text-red-100">{error}</p>}

          {verificationUrl && (
            <div className="rounded-lg border border-[#00e676]/30 bg-[#00e676]/10 p-3 text-xs text-white/70">
              Email sending is not configured yet. For local testing, open:
              <a className="mt-1 block break-all font-mono text-[#00e676]" href={verificationUrl}>
                {verificationUrl}
              </a>
            </div>
          )}

          <button
            disabled={loading || !databaseConfigured}
            className="h-11 w-full rounded-lg bg-[#00e676] text-sm font-black text-black hover:bg-[#1fe682] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? 'Working...' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <a
          href="/api/auth/google/start"
          className="mt-3 flex h-11 w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white"
        >
          Continue with Google
        </a>
      </div>
    </div>
  );
};
