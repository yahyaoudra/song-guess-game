import React, { useState } from 'react';
import { Lock, Mail, X } from 'lucide-react';
import { AuthSessionResponse } from '../adminTypes';
import { loginUser, registerUser } from '../utils/authApi';
import { setAnalyticsUser, trackEvent } from '../utils/analytics';

interface AuthModalProps {
  onClose: () => void;
  onAuthenticated: (session: AuthSessionResponse) => void;
  databaseConfigured: boolean;
  initialMode?: 'login' | 'register';
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
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setVerificationUrl(null);
    setVerificationNotice(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const result = await registerUser(email.trim(), password, name.trim());
        trackEvent('sign_up', {
          method: 'email',
          email_sent: Boolean(result.emailSent)
        });
        setVerificationNotice(
          result.emailSent
            ? 'Check your email to verify your account. After verification, sign in to play with your account benefits.'
            : 'Account created. Email sending is not configured, so use the local verification link below.'
        );
        if (result.verificationUrl && result.emailSent === false) {
          setVerificationUrl(result.verificationUrl);
        }
        return;
      }

      const session = await loginUser(email.trim(), password);
      setAnalyticsUser(session.user?.id);
      trackEvent('login', {
        method: 'email',
        user_id: session.user?.id
      });
      onAuthenticated(session);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
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

          {verificationNotice && (
            <div className="rounded-lg border border-[#00e676]/30 bg-[#00e676]/10 p-3 text-xs leading-5 text-white/75">
              {verificationNotice}
            </div>
          )}

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
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
          </svg>
          Continue with Google
        </a>
      </div>
    </div>
  );
};
