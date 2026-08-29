import React, { useRef, useState } from 'react';
import { Share2, Download, CheckCheck, Flame, Trophy, Sparkles, Copy, Check, Mic2, Tags } from 'lucide-react';
import { GameResult } from '../types';
import { COUNTRIES } from '../data/countries';
import { getDailyStreak } from '../utils/storage';
import { getPublicHost, getShareUrl } from '../utils/domain';
import { getArtistPath, getCountryPath, getGenrePath } from '../utils/runtimeConfig';
import { downloadScoreCardImage, copyScoreCardImageToClipboard } from '../utils/scoreCardCanvas';

interface ShareCardModalProps {
  result: GameResult;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({ result, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const streak = getDailyStreak();

  const activeCountry =
    COUNTRIES.find((c) => c.code === (result.countryCode || 'GLOBAL')) || COUNTRIES[0];
  const isFocusedChallenge = result.challengeType === 'artist' || result.challengeType === 'genre';

  const correctCount = result.rounds.filter((r) => r.isCorrect).length;
  const timeFormatted = `${Math.floor(result.durationSeconds / 60)}:${String(
    result.durationSeconds % 60
  ).padStart(2, '0')}`;

  const handleDownloadImage = async () => {
    try {
      setIsGenerating(true);
      const success = await downloadScoreCardImage(result);
      if (success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to download image', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyImage = async () => {
    try {
      setIsGenerating(true);
      const success = await copyScoreCardImageToClipboard(result);
      if (success) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        handleCopyText();
      }
    } catch (err) {
      console.error('Failed to copy image', err);
      handleCopyText();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = () => {
    const symbols = result.rounds.map((r) => (r.isCorrect ? '🟩' : '🟥')).join('');
    const sharePath =
      result.challengeType === 'artist' && result.challengeSlug
        ? getArtistPath(result.challengeSlug)
        : result.challengeType === 'genre' && result.challengeSlug
        ? getGenrePath(result.challengeSlug)
        : getCountryPath(result.countryCode);
    const shareLink = getShareUrl(sharePath);
    const text = `🎵 Song Guess Game: ${result.totalPoints} PTS (${correctCount}/${result.rounds.length})\n🔥 Daily Streak: ${streak.currentStreak} days\n${symbols}\nCan you beat me? Play at: ${shareLink}`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#131916] border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center my-auto">
        <div className="flex items-center justify-between w-full mb-3">
          <span className="text-xs font-mono font-bold text-[#00e676] uppercase tracking-wider">
            Share Performance Card
          </span>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/5 transition-colors cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* High-Resolution Aesthetic Share Card to Snapshot */}
        <div
          ref={cardRef}
          id="social-share-card-canvas"
          className="w-full bg-gradient-to-br from-[#0c120f] via-[#141d18] to-[#0d1612] border border-white/20 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Radial Ambient Glow */}
          <div className="absolute -top-20 -right-20 w-44 h-44 bg-[#00e676]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Logo & Challenge Context */}
          <div className="flex items-center justify-between w-full mb-4">
            <div className="flex items-center gap-1.5 font-black text-sm text-white">
              <span className="text-[#00e676]">🎵</span>
              <span>Song Guess Game</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-xs text-white">
              {isFocusedChallenge ? (
                <>
                  {result.challengeType === 'artist' ? (
                    <Mic2 className="w-3 h-3 text-yellow-300" />
                  ) : (
                    <Tags className="w-3 h-3 text-cyan-300" />
                  )}
                  <span className="font-semibold text-[11px]">{result.collectionTitle || 'Focused challenge'}</span>
                </>
              ) : (
                <>
                  <span>{activeCountry.flag}</span>
                  <span className="font-semibold text-[11px]">{activeCountry.name}</span>
                </>
              )}
            </div>
          </div>

          {/* Player Nickname & Title */}
          <div className="mb-2">
            <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest block">
              {result.mode === 'daily' ? 'DAILY 5 CHALLENGE' : result.collectionTitle || 'QUIZ'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {result.nickname ? result.nickname : 'Anonymous Music Legend'}
            </h3>
          </div>

          {/* Big Score Header */}
          <div className="my-3 px-6 py-2 rounded-2xl bg-black/40 border border-[#00e676]/30 shadow-inner">
            <span className="text-3xl sm:text-4xl font-black text-[#00e676] font-mono tracking-tight">
              {result.totalPoints} <span className="text-sm font-sans font-bold text-white/70">PTS</span>
            </span>
          </div>

          {/* 5 Result Round Boxes */}
          <div className="flex items-center justify-center gap-2 mb-4 w-full">
            {result.rounds.map((round, idx) => (
              <div
                key={idx}
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-md ${
                  round.isCorrect
                    ? 'bg-[#00e676] text-black'
                    : 'bg-red-500/20 border border-red-500/40 text-red-400'
                }`}
              >
                {round.isCorrect ? '✓' : '✗'}
              </div>
            ))}
          </div>

          {/* Metrics Pill Grid */}
          <div className="grid grid-cols-3 gap-2 w-full pt-3 border-t border-white/10 text-xs font-mono">
            <div className="p-2 rounded-xl bg-white/5">
              <span className="block text-[10px] text-white/40">ACCURACY</span>
              <span className="font-bold text-white">{correctCount}/{result.rounds.length}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <span className="block text-[10px] text-white/40">TIME</span>
              <span className="font-bold text-white">{timeFormatted}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#2b170c] border border-amber-500/30 text-amber-300">
              <span className="block text-[10px] text-amber-400/60">STREAK</span>
              <span className="font-bold">🔥 {streak.currentStreak}d</span>
            </div>
          </div>

          {/* Footer Callout */}
          <div className="mt-4 text-[10px] text-white/40 font-sans flex items-center gap-1">
            <span>Play now at</span>
            <strong className="text-white/70">{getPublicHost()}</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2 mt-4">
          <div className="flex gap-2">
            <button
              id="download-card-img-btn"
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="flex-1 py-3 px-4 rounded-xl bg-[#00e676] hover:bg-[#1fe682] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Generating...' : 'Save Card Image'}</span>
            </button>

            <button
              id="copy-card-img-btn"
              onClick={handleCopyImage}
              disabled={isGenerating}
              className="py-3 px-4 rounded-xl bg-[#1d2621] hover:bg-[#27332d] border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Copy to clipboard for WhatsApp, Discord & Instagram"
            >
              {copiedImage ? <CheckCheck className="w-4 h-4 text-[#00e676]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedImage ? 'Copied Image!' : 'Copy Image'}</span>
            </button>
          </div>

          <button
            onClick={handleCopyText}
            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedText ? <CheckCheck className="w-3.5 h-3.5 text-[#00e676]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedText ? 'Text copied to clipboard!' : 'Copy Text Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
