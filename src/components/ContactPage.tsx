import React, { useState } from 'react';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { sendContactRequest } from '../utils/authApi';

interface ContactPageProps {
  onBack: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await sendContactRequest(name, email, message);
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message');
      setStatus('idle');
    }
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-20 pt-8 text-white sm:px-8">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-black text-white/55 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <section className="mt-8 rounded-lg border border-white/10 bg-[#101713] p-5 shadow-2xl sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#00e676] text-black">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Contact Song Guess Game</h1>
            <p className="mt-1 text-sm text-white/55">Messages are sent to info@songguessgame.online.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-white/45">Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#0b110e] px-4 text-white outline-none focus:border-[#00e676]" />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-white/45">Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#0b110e] px-4 text-white outline-none focus:border-[#00e676]" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-white/45">Message</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={7} className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#0b110e] p-4 text-white outline-none focus:border-[#00e676]" />
          </label>
          {error && <p className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
          {status === 'sent' && <p className="rounded-lg border border-[#00e676]/25 bg-[#00e676]/10 p-3 text-sm font-bold text-[#b8ffd7]">Message sent.</p>}
          <button disabled={status === 'sending'} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#00e676] px-6 font-black text-black hover:bg-[#1fe682] disabled:opacity-50">
            <Send className="h-4 w-4" />
            {status === 'sending' ? 'Sending...' : 'Send message'}
          </button>
        </form>
      </section>
    </main>
  );
};
