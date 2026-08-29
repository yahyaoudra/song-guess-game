import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Download, LogOut, Mail, Settings, UserRound } from 'lucide-react';
import { AuthSessionResponse, PaymentRecord } from '../adminTypes';
import { COUNTRIES } from '../data/countries';
import { fetchUserPayments, getReceiptUrl, logoutUser, startEmailChange, updateUserProfile } from '../utils/authApi';

interface AccountMenuProps {
  session: AuthSessionResponse;
  onOpenAuth: () => void;
  onSessionChange: (session: AuthSessionResponse) => void;
}

function getDaysLeft(accessUntil?: string): number {
  if (!accessUntil) return 0;
  const diff = new Date(accessUntil).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ session, onOpenAuth, onSessionChange }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(session.user?.name || '');
  const [email, setEmail] = useState(session.user?.email || '');
  const [countryCode, setCountryCode] = useState(session.user?.countryCode || '');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const daysLeft = useMemo(() => getDaysLeft(session.entitlement.accessUntil), [session.entitlement.accessUntil]);

  useEffect(() => {
    setName(session.user?.name || '');
    setEmail(session.user?.email || '');
    setCountryCode(session.user?.countryCode || '');
  }, [session.user?.name, session.user?.email, session.user?.countryCode]);

  useEffect(() => {
    if (!open || !session.authenticated) return;
    fetchUserPayments()
      .then(setPayments)
      .catch(() => setPayments([]));
  }, [open, session.authenticated]);

  if (!session.authenticated || !session.user) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#141c17] text-white/65 shadow-inner transition-colors hover:border-[#00e676]/40 hover:text-[#00e676]"
        title="Login or sign up"
        aria-label="Login or sign up"
      >
        <UserRound className="h-4 w-4" />
      </button>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const next = await updateUserProfile(name, countryCode);
      onSessionChange(next);
      setNotice('Account settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save account settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async () => {
    if (email.trim().toLowerCase() === session.user?.email.toLowerCase()) {
      setNotice('Email is already current.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await startEmailChange(email.trim());
      setNotice(
        result.emailSent
          ? 'Verification email sent. Open it to confirm the new address.'
          : 'Email sending is not configured yet. Opening the local verification link.'
      );
      if (!result.emailSent) {
        window.open(result.verificationUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start email verification');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onSessionChange({
      authenticated: false,
      entitlement: { active: false },
      databaseConfigured: session.databaseConfigured,
      stripeConfigured: session.stripeConfigured
    });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 max-w-[170px] items-center gap-2 rounded-full border border-white/10 bg-[#141c17] px-2.5 text-xs font-bold text-white/80 shadow-inner transition-colors hover:border-[#00e676]/40 hover:text-white sm:max-w-[220px]"
        aria-expanded={open}
      >
        <UserRound className="h-4 w-4 shrink-0 text-[#00e676]" />
        <span className="hidden min-w-0 truncate sm:inline">{session.user.name || session.user.email}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/35" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[120] mt-2 w-[min(92vw,380px)] rounded-lg border border-white/12 bg-[#0c120f] p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-white">{session.user.name || 'Player account'}</div>
              <div className="truncate text-[11px] text-white/45">{session.user.email}</div>
            </div>
            <button onClick={handleLogout} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/55 hover:text-white" title="Log out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-[#00e676]/20 bg-[#00e676]/8 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-white">Active access</span>
              <span className="rounded-full bg-[#00e676] px-2 py-0.5 text-[10px] font-black text-black">
                {session.entitlement.active ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left` : 'Free'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-white/45">
              {session.entitlement.active ? 'Unlimited artists, countries, genres, and no ads.' : 'No active unlimited pass.'}
            </p>
          </div>

          <div className="mt-3 grid gap-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-white/45">Name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} className="h-9 rounded-lg border border-white/10 bg-[#141c17] px-3 text-sm text-white outline-none focus:border-[#00e676]" />
            <label className="text-[11px] font-bold uppercase tracking-wide text-white/45">Country</label>
            <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="h-9 rounded-lg border border-white/10 bg-[#141c17] px-3 text-sm text-white outline-none focus:border-[#00e676]">
              <option value="">None</option>
              {COUNTRIES.filter((country) => country.code !== 'GLOBAL').map((country) => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
            <button onClick={handleSaveProfile} disabled={saving} className="flex h-9 items-center justify-center gap-2 rounded-lg bg-[#00e676] text-xs font-black text-black disabled:opacity-50">
              <Settings className="h-3.5 w-3.5" />
              Save settings
            </button>
          </div>

          <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
            <label className="text-[11px] font-bold uppercase tracking-wide text-white/45">Change email</label>
            <div className="flex gap-2">
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#141c17] px-3 text-sm text-white outline-none focus:border-[#00e676]" />
              <button onClick={handleEmailChange} disabled={saving} className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg border border-[#00e676]/40 text-[#00e676] disabled:opacity-50" title="Verify new email">
                <Mail className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-white">
              <Check className="h-3.5 w-3.5 text-[#00e676]" />
              Pass history
            </div>
            <div className="max-h-36 space-y-1.5 overflow-y-auto">
              {payments.length === 0 ? (
                <p className="text-[11px] text-white/40">No payments yet.</p>
              ) : payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1.5 text-[11px]">
                  <span className="min-w-0 truncate text-white/60">
                    ${(payment.amountCents / 100).toFixed(2)} {payment.currency.toUpperCase()} · {payment.status}
                  </span>
                  <a href={getReceiptUrl(payment.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-white/55 hover:text-[#00e676]" title="Download receipt">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {(notice || error) && (
            <p className={`mt-3 rounded-lg border p-2 text-[11px] ${error ? 'border-red-400/30 bg-red-400/10 text-red-100' : 'border-[#00e676]/30 bg-[#00e676]/10 text-[#00e676]'}`}>
              {error || notice}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
