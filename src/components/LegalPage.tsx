import React, { useState, useEffect } from 'react';
import { Shield, ArrowLeft, Lock, FileText, Globe, CheckCircle2, Mail, ExternalLink } from 'lucide-react';
import { getPublicAppUrl, getPublicHost } from '../utils/domain';
import { getLegalPath } from '../utils/runtimeConfig';

export type LegalSectionKey = 'privacy' | 'gdpr' | 'california' | 'terms' | 'cookies';

interface LegalPageProps {
  initialSection?: LegalSectionKey;
  onBackToGame: () => void;
  onSectionChange?: (section: LegalSectionKey) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({
  initialSection = 'privacy',
  onBackToGame,
  onSectionChange
}) => {
  const [activeSection, setActiveSection] = useState<LegalSectionKey>(initialSection);
  const domainHost = getPublicHost();
  const domainUrl = getPublicAppUrl();

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  // Scroll to top when section changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  const selectSection = (section: LegalSectionKey) => {
    setActiveSection(section);
    onSectionChange?.(section);
    try {
      window.history.pushState({}, document.title, getLegalPath(section));
    } catch {}
  };

  return (
    <div
      id="legal-compliance-page"
      className="min-h-screen w-full bg-[#080c0a] text-white flex flex-col justify-between font-sans selection:bg-[#00e676] selection:text-black animate-in fade-in duration-200"
    >
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 w-full bg-[#0d1310]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToGame}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Return to song quiz"
          >
            <ArrowLeft className="w-4 h-4 text-[#00e676]" />
            <span>Back to Game</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-black text-white">🎵 Song Guess Game</span>
            <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/50 font-mono hidden md:inline">
              Compliance & Legal
            </span>
          </div>
        </div>

        <button
          onClick={onBackToGame}
          className="px-4 py-1.5 rounded-full bg-[#00e676] hover:bg-[#1fe682] text-black font-black text-xs transition-all cursor-pointer shadow-md"
        >
          Play Quiz
        </button>
      </header>

      {/* Main Content Container */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1">
        {/* Breadcrumb and Title Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-2 font-mono">
            <button onClick={onBackToGame} className="hover:text-white transition-colors cursor-pointer">
              Home
            </button>
            <span>/</span>
            <span className="text-[#00e676]">Legal & Privacy Center</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Shield className="w-7 h-7 sm:w-9 sm:h-9 text-[#00e676]" />
            <span>Privacy Policy & Legal Standards</span>
          </h1>

          <p className="text-xs sm:text-sm text-white/60 mt-2 max-w-2xl leading-relaxed">
            Transparent privacy disclosures, European Union General Data Protection Regulation (GDPR) compliance,
            California Consumer Privacy Act (CCPA/CPRA) terms, and general conditions of service for {domainHost}.
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 border-b border-white/10 text-xs no-scrollbar">
          <button
            onClick={() => selectSection('privacy')}
            className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === 'privacy'
                ? 'bg-[#00e676] text-black shadow-lg'
                : 'bg-[#121815] text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            Privacy Policy
          </button>

          <button
            onClick={() => selectSection('gdpr')}
            className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === 'gdpr'
                ? 'bg-[#00e676] text-black shadow-lg'
                : 'bg-[#121815] text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            EU & UK GDPR Rights
          </button>

          <button
            onClick={() => selectSection('california')}
            className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === 'california'
                ? 'bg-[#00e676] text-black shadow-lg'
                : 'bg-[#121815] text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            California CCPA / CPRA
          </button>

          <button
            onClick={() => selectSection('terms')}
            className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === 'terms'
                ? 'bg-[#00e676] text-black shadow-lg'
                : 'bg-[#121815] text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            Terms of Use
          </button>

          <button
            onClick={() => selectSection('cookies')}
            className={`px-4 py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              activeSection === 'cookies'
                ? 'bg-[#00e676] text-black shadow-lg'
                : 'bg-[#121815] text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            Cookies & Advertising
          </button>
        </div>

        {/* Section Detailed View */}
        <div className="bg-[#0f1512] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl leading-relaxed text-white/80 space-y-6 text-xs sm:text-sm">
          {/* 1. Privacy Policy */}
          {activeSection === 'privacy' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-mono text-[#00e676] uppercase tracking-widest block mb-1">
                  Privacy Statement
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">1. Information We Collect & How We Use It</h2>
              </div>

              <p>
                Welcome to <strong>Song Guess Game</strong> (hosted at <span className="text-[#00e676] font-mono">{domainUrl}</span>). This page explains how the game uses browser storage, player accounts, weekly access payments, server-side activity logs, optional Google Analytics, optional Google AdSense, and manual advertising banners.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-[#141d18] border border-white/10 rounded-2xl">
                  <h4 className="font-bold text-white mb-1.5 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00e676]" />
                    <span>Accounts and Verification</span>
                  </h4>
                  <p className="text-xs text-white/60">
                    Free browsing does not require an account. Paid weekly access, multiplayer identity, and saved access status may use your email address, display name, password hash, Google login identifier, verification status, and secure session cookies.
                  </p>
                </div>

                <div className="p-4 bg-[#141d18] border border-white/10 rounded-2xl">
                  <h4 className="font-bold text-white mb-1.5 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00e676]" />
                    <span>Client-Side Local Storage</span>
                  </h4>
                  <p className="text-xs text-white/60">
                    Your gameplay preferences, volume levels, daily streaks, and custom nickname are stored locally on your device via standard browser storage.
                  </p>
                </div>

                <div className="p-4 bg-[#141d18] border border-white/10 rounded-2xl">
                  <h4 className="font-bold text-white mb-1.5 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00e676]" />
                    <span>Server Activity Logs</span>
                  </h4>
                  <p className="text-xs text-white/60">
                    Completed games may be logged with country, mode, score, accuracy, duration, optional nickname, page path, browser user agent, and a one-way hashed IP marker for abuse prevention.
                  </p>
                </div>

                <div className="p-4 bg-[#141d18] border border-white/10 rounded-2xl">
                  <h4 className="font-bold text-white mb-1.5 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00e676]" />
                    <span>Optional Google Services</span>
                  </h4>
                  <p className="text-xs text-white/60">
                    If enabled by the site owner, Google Analytics measures page views, Search Console verifies site ownership, and AdSense may serve ads in configured placements.
                  </p>
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white pt-2">2. Audio Streaming & Fair Use</h3>
              <p>
                Song Guess Game streams short audio preview snippets, generally limited to public preview clips from music catalog APIs such as Deezer and Apple Music, for musical recognition, educational engagement, and cultural commentary. All intellectual property rights, trademarks, and artist recordings remain the property of their respective owners.
              </p>

              <h3 className="text-base sm:text-lg font-bold text-white pt-2">3. Data Retention & Deletion</h3>
              <p>
                Local progress can be removed by clearing browser site data. Server activity logs, account records, email verification tokens, daily free-play records, entitlement dates, and payment references are kept for account access, fraud prevention, support, refunds, and operational review. Stripe processes card details directly; Song Guess Game stores payment identifiers and status, not full card numbers. To request deletion of server-side data tied to your email or nickname, contact <code className="text-[#00e676]">privacy@{domainHost}</code>.
              </p>
            </div>
          )}

          {/* 2. EU & UK GDPR */}
          {activeSection === 'gdpr' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-mono text-[#00e676] uppercase tracking-widest block mb-1">
                  European Economic Area & UK Notice
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">General Data Protection Regulation (GDPR)</h2>
              </div>

              <p>
                If you are a resident of the European Union, European Economic Area (EEA), or United Kingdom, you are entitled to specific rights under Regulation (EU) 2016/679 (GDPR).
              </p>

              <div className="space-y-3">
                <div className="p-4 bg-[#141d18] border border-white/10 rounded-2xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#00e676]/20 text-[#00e676] font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    1
                  </span>
                  <div>
                    <h4 className="font-bold text-white">Right of Access (Article 15)</h4>
                    <p className="text-xs text-white/60">You have the right to request confirmation of whether any personal data concerning you is processed.</p>
                  </div>
                </div>

                <div className="p-4 bg-[#141d18] border border-white/10 rounded-2xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#00e676]/20 text-[#00e676] font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    2
                  </span>
                  <div>
                    <h4 className="font-bold text-white">Right to Erasure / &quot;Right to be Forgotten&quot; (Article 17)</h4>
                    <p className="text-xs text-white/60">You can erase locally stored data by clearing browser site data. Account, payment reference, and entitlement deletion requests can be sent to the site administrator, subject to legal, refund, fraud-prevention, and tax retention needs.</p>
                  </div>
                </div>

                <div className="p-4 bg-[#141d18] border border-white/10 rounded-2xl flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-[#00e676]/20 text-[#00e676] font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    3
                  </span>
                  <div>
                    <h4 className="font-bold text-white">Right to Restrict or Object to Processing (Article 18 & 21)</h4>
                  <p className="text-xs text-white/60">You may object to non-essential analytics or advertising processing where applicable by contacting the site administrator.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#16221c] border border-[#00e676]/25 rounded-2xl">
                <span className="font-bold text-white block mb-1">Data Controller Information</span>
                <p className="text-xs text-white/60">
                  For privacy questions, data requests, or compliance inquiries, contact: <code className="text-[#00e676]">privacy@{domainHost}</code>.
                </p>
              </div>
            </div>
          )}

          {/* 3. California Policy */}
          {activeSection === 'california' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-mono text-[#00e676] uppercase tracking-widest block mb-1">
                  State of California Compliance
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">California Consumer Privacy Act (CCPA / CPRA)</h2>
              </div>

              <p>
                This California Consumer Privacy Statement supplements our general Privacy Policy and applies solely to consumers residing in the State of California.
              </p>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                <h4 className="font-bold text-amber-300 mb-1">“Do Not Sell or Share My Personal Information”</h4>
                <p className="text-xs text-white/70">
                  <strong>Song Guess Game does not sell personal information to data brokers.</strong> If Google AdSense is enabled, Google and its partners may process advertising data under their own policies and controls. If you buy weekly access, Stripe processes payment information under Stripe&apos;s privacy terms.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-white text-base">Your Statutory Rights under CCPA:</h3>
                <ul className="list-disc pl-5 space-y-1 text-white/70 text-xs sm:text-sm">
                  <li><strong>Right to Know:</strong> You may request information regarding the categories and specific pieces of personal information collected over the preceding 12 months.</li>
                  <li><strong>Right to Delete:</strong> You have the right to request the deletion of personal information collected from you.</li>
                  <li><strong>Right to Correct:</strong> You may request correction of account information associated with your email address.</li>
                  <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you (e.g., through degraded service quality) for exercising any CCPA right.</li>
                </ul>
              </div>
            </div>
          )}

          {/* 4. Terms of Use */}
          {activeSection === 'terms' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-mono text-[#00e676] uppercase tracking-widest block mb-1">
                  Conditions of Service
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">Terms of Use & Fair Play</h2>
              </div>

              <p>
                By accessing and playing Song Guess Game on <strong>{domainHost}</strong>, you agree to comply with these terms:
              </p>

              <div className="space-y-3 text-xs sm:text-sm text-white/70">
                <p>
                  <strong>1. Permitted Use:</strong> The game is provided for personal, non-commercial entertainment and cultural education. You agree not to reverse engineer the audio delivery pipeline or scrape audio files.
                </p>
                <p>
                  <strong>2. Leaderboard Fair Play:</strong> Players must not use automated bots, timing manipulation scripts, or decompilation tools to artificially inflate leaderboard records.
                </p>
                <p>
                  <strong>3. Paid Weekly Access:</strong> A $3.99 one-time payment unlocks unlimited play for 7 days and hides ads while access is active. It is not an automatically renewing subscription.
                </p>
                <p>
                  <strong>4. Refunds:</strong> Refund requests may be reviewed through the administrator payment dashboard and processed through Stripe where eligible.
                </p>
                <p>
                  <strong>5. Intellectual Property:</strong> Track names, artist trademarks, and album artwork shown during reveals are owned by their respective artists and copyright holders.
                </p>
              </div>
            </div>
          )}

          {/* 5. Cookies & Advertising */}
          {activeSection === 'cookies' && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-mono text-[#00e676] uppercase tracking-widest block mb-1">
                  AdSense & Cookie Policy
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">Cookies & Contextual Advertising</h2>
              </div>

              <p>
                We use browser storage to remember your game state, audio volume, selected music scene, nickname, leaderboard entries, daily streaks, and free-play status. Secure cookies may keep player and admin sessions active. If Google Analytics is enabled, Google tags measure site usage. If Google AdSense is enabled, Google may use cookies or similar technologies for advertising. Manual banner ads may record visits only through the advertiser link you choose to open. Paid weekly access hides configured in-app ad placements while active.
              </p>

              <div className="p-4 bg-[#141d18] border border-white/10 rounded-2xl space-y-2 text-xs text-white/70">
                <h4 className="font-bold text-white text-sm">Third-Party Advertisers and Manual Banners</h4>
                <p>
                  Third-party vendors, including Google, may use cookies to serve ads based on visits to this website or other websites. The site owner can also configure manual image banners in the same ad placements; these banners are direct links and do not run custom HTML in the app.
                </p>
                <p>
                  Users may opt out of personalized advertising by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-[#00e676] underline">aboutads.info</a> or adjusting Google Ads Settings.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Call to Action */}
        <div className="mt-8 p-6 bg-gradient-to-r from-[#0d1612] via-[#14221b] to-[#0d1612] border border-white/15 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h3 className="font-black text-white text-base">Ready to test your music knowledge?</h3>
            <p className="text-xs text-white/60">Challenge yourself with today&apos;s 5-track mystery quiz.</p>
          </div>

          <button
            onClick={onBackToGame}
            className="px-6 py-3 rounded-2xl bg-[#00e676] hover:bg-[#1fe682] text-black font-black text-xs sm:text-sm tracking-wide transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
          >
            Start Playing Now →
          </button>
        </div>
      </main>

      {/* Production Minimal Footer */}
      <footer className="w-full py-4 px-6 border-t border-white/10 bg-[#0a0f0d] text-center text-xs text-white/40">
        <span>© 2026 {domainHost} • All Rights Reserved</span>
      </footer>
    </div>
  );
};
