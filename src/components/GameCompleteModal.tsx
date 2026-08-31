import React, { useState, useEffect } from 'react';
import { Check, X, Share2, Trophy, RotateCcw, ShieldCheck, CheckCheck, AlertCircle, Flame, Download, Mic2, Tags } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameResult, UserSettings } from '../types';
import { addLeaderboardEntry, saveStoredSettings, getStoredSettings, isNicknameTaken, getDailyStreak } from '../utils/storage';
import { COUNTRIES } from '../data/countries';
import { getShareUrl } from '../utils/domain';
import { getArtistPath, getCountryPath, getGenrePath } from '../utils/runtimeConfig';
import { downloadScoreCardImage } from '../utils/scoreCardCanvas';
import { publishLeaderboardEntry } from '../utils/authApi';

interface GameCompleteModalProps {
  result: GameResult;
  onPlayAgain: () => void;
  onOpenLeaderboard: () => void;
  onOpenShareCard?: (result: GameResult) => void;
  onSettingsChanged?: (settings: UserSettings) => void;
  onClose: () => void;
}

export const GameCompleteModal: React.FC<GameCompleteModalProps> = ({
  result,
  onPlayAgain,
  onOpenLeaderboard,
  onOpenShareCard,
  onSettingsChanged
}) => {
  const settings = getStoredSettings();
  const streak = getDailyStreak();
  const [nickname, setNickname] = useState(settings.nickname || '');
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);
  const [downloadedCard, setDownloadedCard] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const correctCount = result.rounds.filter((r) => r.isCorrect).length;
  const activeCountry = COUNTRIES.find((c) => c.code === (result.countryCode || settings.selectedCountry)) || COUNTRIES[0];
  const isFocusedChallenge = result.challengeType === 'artist' || result.challengeType === 'genre';

  const trimmedNickname = nickname.trim();
  const savedNickname = (settings.nickname || '').trim().toLowerCase();
  const isSavedPlayerNickname = Boolean(savedNickname && trimmedNickname.toLowerCase() === savedNickname);
  const isTaken = !isSavedPlayerNickname && isNicknameTaken(trimmedNickname, result.id);
  const isTooShort = trimmedNickname.length < 2;
  const sharePath =
    result.challengeType === 'artist' && result.challengeSlug
      ? getArtistPath(result.challengeSlug)
      : result.challengeType === 'genre' && result.challengeSlug
      ? getGenrePath(result.challengeSlug)
      : getCountryPath(result.countryCode || settings.selectedCountry);

  useEffect(() => {
    // Launch energetic dual particle cannons for victory!
    const count = 200;
    const defaults = {
      origin: { y: 0.7 }
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#00e676', '#ffd600', '#00e5ff']
    });
    fire(0.2, {
      spread: 60,
      colors: ['#c084fc', '#ff5252', '#00e676']
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      colors: ['#ffd600', '#00e676', '#ffffff']
    });
  }, []);

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    setErrorMessage(null);
  };

  useEffect(() => {
    const storedNickname = getStoredSettings().nickname || result.nickname || '';
    if (storedNickname) {
      setNickname(storedNickname);
      setErrorMessage(null);
    }
    setIsPublished(false);
  }, [result.id, result.nickname]);

  const handlePublishScore = async () => {
    if (!trimmedNickname) {
      setErrorMessage('Please enter a nickname to publish your score.');
      return;
    }
    if (isTooShort) {
      setErrorMessage('Nickname must be at least 2 characters.');
      return;
    }
    if (isTaken) {
      setErrorMessage(`"${trimmedNickname}" is already taken. Please choose a unique nickname.`);
      return;
    }

    const nextSettings = { ...settings, nickname: trimmedNickname };
    saveStoredSettings(nextSettings);
    onSettingsChanged?.(nextSettings);

    const formattedTime = `${Math.floor(result.durationSeconds / 60)}:${String(
      result.durationSeconds % 60
    ).padStart(2, '0')}`;
    const leaderboardBadge = isFocusedChallenge
      ? correctCount === 5
        ? 'Top Ear'
        : correctCount >= 4
        ? 'Pro Listener'
        : 'Fan'
      : correctCount === 5
      ? `${activeCountry.flag} Top Ear`
      : correctCount >= 4
      ? '🔥 Pro Listener'
      : '⚡ Fan';

    const leaderboardEntry = {
      id: result.id,
      nickname: trimmedNickname,
      countryCode: result.countryCode || settings.selectedCountry || 'GLOBAL',
      points: result.totalPoints,
      correctCount: correctCount,
      totalRounds: result.rounds.length,
      timeFormatted: formattedTime,
      date: 'Today',
      isCurrentUser: true,
      badge: leaderboardBadge
    };

    setIsPublishing(true);
    setErrorMessage(null);
    try {
      const published = await publishLeaderboardEntry({
        ...leaderboardEntry,
        durationSeconds: result.durationSeconds,
        mode: result.mode,
        collectionTitle: result.collectionTitle,
        challengeType: result.challengeType,
        challengeSlug: result.challengeSlug
      });
      addLeaderboardEntry({ ...leaderboardEntry, ...published, isCurrentUser: true });
      setIsPublished(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not publish leaderboard score.';
      setErrorMessage(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyShare = () => {
    const symbols = result.rounds.map((r) => (r.isCorrect ? '🟩' : '🟥')).join('');
    const shareLink = getShareUrl(sharePath);

    const text = `🎵 Song Guess Game (${
      result.mode === 'daily' ? 'Daily 5' : result.collectionTitle || 'Quiz'
    })\nScore: ${result.totalPoints} PTS (${correctCount}/${result.rounds.length})\n${symbols}\nPlay at: ${shareLink}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadScoreCard = async () => {
    setIsDownloadingCard(true);
    const success = await downloadScoreCardImage({
      ...result,
      nickname: trimmedNickname || result.nickname || settings.nickname
    });
    setIsDownloadingCard(false);

    if (success) {
      setDownloadedCard(true);
      setTimeout(() => setDownloadedCard(false), 2500);
      onOpenShareCard?.({
        ...result,
        nickname: trimmedNickname || result.nickname || settings.nickname
      });
      return;
    }

    setErrorMessage('Could not download the score card image. Try the share card panel.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300 select-none">
      <div
        id="game-complete-card"
        className="relative w-full max-w-md bg-[#131916] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center my-auto"
      >
        {/* Title Tag */}
        <span className="text-[11px] font-mono font-black uppercase tracking-widest text-[#00e676] mb-2">
          {result.mode === 'daily'
            ? 'DAILY 5 COMPLETE'
            : `${result.collectionTitle?.toUpperCase() || 'QUIZ'} COMPLETE`}
        </span>

        {/* Large Score Total */}
        <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3">
          {result.totalPoints} points
        </h2>

        {/* Daily Streak Achievement Badge */}
        {result.mode === 'daily' && (
          <div
            id="daily-streak-achievement"
            className="flex items-center justify-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-[#2a170d] border border-amber-500/40 text-amber-300 text-xs font-bold shadow-md animate-bounce"
          >
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>
              {streak.currentStreak > 1
                ? `🔥 ${streak.currentStreak} Day Streak Kept Alive!`
                : '🔥 Daily Quiz Streak Started!'}
            </span>
          </div>
        )}

        {/* 5 Result Status Tiles */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 w-full">
          {result.rounds.map((round, index) => (
            <div
              key={index}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-bold text-white shadow-lg transition-transform hover:scale-105 ${
                round.isCorrect
                  ? 'bg-[#00e676] text-black'
                  : 'bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ef4444]'
              }`}
            >
              {round.isCorrect ? (
                <Check className="w-7 h-7 stroke-[3]" />
              ) : (
                <X className="w-7 h-7 stroke-[3]" />
              )}
            </div>
          ))}
        </div>

        {/* Accuracy and time subtitle */}
        <p className="text-xs font-mono text-white/60 mb-6">
          {correctCount}/{result.rounds.length} correct •{' '}
          {Math.floor(result.durationSeconds / 60)}:
          {String(result.durationSeconds % 60).padStart(2, '0')} •{' '}
          {isPublished ? 'Published on Leaderboard' : 'Not published yet'}
        </p>

        {/* Nickname Input section */}
        <div className="w-full text-left mb-6">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="user-nickname-input" className="block text-xs font-bold text-white/90">
              {settings.nickname ? 'Public leaderboard nickname' : 'Choose your unique public nickname'}
            </label>
            {trimmedNickname && !isTaken && !isTooShort && (
              <span className="text-[11px] text-[#00e676] font-semibold flex items-center gap-1">
                ✓ Available
              </span>
            )}
          </div>
          <input
            id="user-nickname-input"
            type="text"
            value={nickname}
            onChange={(e) => handleNicknameChange(e.target.value)}
            maxLength={20}
            disabled={isPublished}
            placeholder="Type your unique nickname..."
            className={`w-full px-4 py-2.5 bg-[#0e1411] border rounded-xl text-white text-sm focus:outline-none transition-colors shadow-inner ${
              isTaken || errorMessage
                ? 'border-red-500/60 focus:border-red-400'
                : trimmedNickname && !isTooShort
                ? 'border-[#00e676]/60 focus:border-[#00e676]'
                : 'border-white/10 focus:border-white/30'
            }`}
          />

          {/* Validation & Error status feedback */}
          {errorMessage ? (
            <div className="flex items-center gap-1.5 text-xs text-red-400 mt-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : isTaken ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>This nickname is already taken. Please choose another unique name.</span>
            </div>
          ) : !trimmedNickname ? (
            <p className="text-[11px] text-white/40 mt-1.5">
              Enter one unique player nickname to publish to the leaderboard.
            </p>
          ) : isTooShort ? (
            <p className="text-[11px] text-amber-400/80 mt-1.5">
              Nickname must be at least 2 characters long.
            </p>
          ) : (
            <p className="text-[11px] text-white/40 mt-1.5">
              Unique nickname ready to submit.
            </p>
          )}

          {/* Cloudflare-style verified badge */}
          <div className="mt-3 w-full bg-[#18201c] border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#00e676] font-bold">
              <ShieldCheck className="w-5 h-5 text-[#00e676]" />
              <span>Verified Score Submission</span>
            </div>
            <div className="text-[10px] text-white/40 flex items-center gap-1 font-mono">
              {isFocusedChallenge ? (
                <>
                  {result.challengeType === 'artist' ? (
                    <Mic2 className="w-3 h-3 text-yellow-300" />
                  ) : (
                    <Tags className="w-3 h-3 text-cyan-300" />
                  )}
                  <span>{result.collectionTitle || 'Focused challenge'}</span>
                </>
              ) : (
                <span>{activeCountry.flag} {activeCountry.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Publishing & Sharing Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {onOpenShareCard && (
            <button
              id="game-complete-card-image-btn"
              onClick={handleDownloadScoreCard}
              disabled={isDownloadingCard}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-[#00e676] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-102 active:scale-98 transition-all cursor-pointer"
            >
              {downloadedCard ? <CheckCheck className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>{isDownloadingCard ? 'Generating score card...' : downloadedCard ? 'Score card downloaded' : 'Download & Share My Score Card'}</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              id="publish-nickname-btn"
              onClick={handlePublishScore}
              disabled={isPublished || isPublishing || !trimmedNickname || isTooShort || isTaken}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all cursor-pointer shadow-lg ${
                isPublished
                  ? 'bg-white/10 text-white/50 cursor-default'
                  : isPublishing || !trimmedNickname || isTooShort || isTaken
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-[#00e676] hover:bg-[#1fe682] active:scale-95 text-black'
              }`}
            >
              {isPublished ? 'Score Published ✓' : isPublishing ? 'Publishing...' : 'Publish unique score'}
            </button>

            <button
              id="share-result-btn"
              onClick={handleCopyShare}
              className="py-3 px-4 bg-[#1e2622] hover:bg-[#28332d] active:scale-95 border border-white/15 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Copy result"
            >
              {copied ? <CheckCheck className="w-4 h-4 text-[#00e676]" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              id="view-leaderboard-btn"
              onClick={onOpenLeaderboard}
              className="flex-1 py-2.5 bg-[#141b17] hover:bg-[#1c2520] border border-white/10 rounded-xl text-xs font-bold text-white/80 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-[#ffd600]" />
              <span>Full leaderboard</span>
            </button>

            <button
              id="play-practice-again-btn"
              onClick={onPlayAgain}
              className="flex-1 py-2.5 bg-[#141b17] hover:bg-[#1c2520] border border-white/10 rounded-xl text-xs font-bold text-white/80 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Play Again</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
