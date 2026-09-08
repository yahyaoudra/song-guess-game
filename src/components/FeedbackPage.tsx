import React, { useEffect, useState } from 'react';
import { Headphones, Loader2, MessageSquareText, Music2, Radio, Sparkles, Star, Users } from 'lucide-react';
import { AuthSessionResponse } from '../adminTypes';
import { ApiRequestError, fetchMyFeedback, submitFeedback } from '../utils/authApi';

type RatingKey = 'overallRating' | 'gameplayRating' | 'audioRating' | 'packsRating' | 'multiplayerRating';

interface FeedbackPageProps {
  authSession: AuthSessionResponse;
  onOpenAuth: () => void;
  onSessionChange: (session: AuthSessionResponse) => void;
  onPlay: () => void;
}

const feedbackRows: Array<{
  key: RatingKey;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'overallRating', label: 'Overall experience', hint: 'How the game feels end to end.', icon: Sparkles },
  { key: 'gameplayRating', label: 'Guessing flow', hint: 'Search, rounds, score, and pace.', icon: Star },
  { key: 'audioRating', label: 'Song clips', hint: 'Preview quality and clip timing.', icon: Headphones },
  { key: 'packsRating', label: 'Packs and albums', hint: 'Artists, countries, genres, and album picks.', icon: Music2 },
  { key: 'multiplayerRating', label: 'Multiplayer rooms', hint: 'Lobby, turns, room info, and sharing.', icon: Users }
];

const emptyRatings: Record<RatingKey, number> = {
  overallRating: 0,
  gameplayRating: 0,
  audioRating: 0,
  packsRating: 0,
  multiplayerRating: 0
};

export const FeedbackPage: React.FC<FeedbackPageProps> = ({
  authSession,
  onOpenAuth,
  onSessionChange,
  onPlay
}) => {
  const [ratings, setRatings] = useState(emptyRatings);
  const [comment, setComment] = useState('');
  const [rewardDays, setRewardDays] = useState(2);
  const [hasExistingFeedback, setHasExistingFeedback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authSession.authenticated) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchMyFeedback()
      .then((result) => {
        if (cancelled) return;
        setRewardDays(result.rewardDays || 2);
        if (result.feedback) {
          setHasExistingFeedback(true);
          setRatings({
            overallRating: result.feedback.overallRating,
            gameplayRating: result.feedback.gameplayRating,
            audioRating: result.feedback.audioRating,
            packsRating: result.feedback.packsRating,
            multiplayerRating: result.feedback.multiplayerRating
          });
          setComment(result.feedback.comment || '');
        }
      })
      .catch((fetchError) => {
        if (cancelled) return;
        if (fetchError instanceof ApiRequestError && fetchError.requiresAuth) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load your feedback');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authSession.authenticated) {
      onOpenAuth();
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const result = await submitFeedback({ ...ratings, comment });
      onSessionChange(result.session);
      setHasExistingFeedback(true);
      setNotice(
        result.rewardGranted
          ? `Thanks. ${result.rewardDays} days of unlimited access were added to your account.`
          : 'Thanks. Your feedback was updated.'
      );
    } catch (submitError) {
      if (submitError instanceof ApiRequestError && submitError.requiresAuth) {
        onOpenAuth();
      } else {
        setError(submitError instanceof Error ? submitError.message : 'Could not submit feedback');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-8 text-white sm:px-8">
      <section className="rounded-lg border border-white/10 bg-[#0b120e]/90 p-5 shadow-2xl sm:p-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00e676]/25 bg-[#00e676]/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#00e676]">
              <Radio className="h-4 w-4" />
              Player feedback
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Help shape Song Guess</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
              Share quick feedback about the game experience. Feedback submitters get {rewardDays} days of unlimited access.
            </p>
          </div>
          <button
            type="button"
            onClick={onPlay}
            className="h-11 rounded-lg border border-[#00e676]/30 bg-[#00e676]/10 px-4 text-sm font-black text-[#00e676] hover:bg-[#00e676]/20"
          >
            Back to play
          </button>
        </div>

        {!authSession.authenticated ? (
          <div className="mt-6 rounded-lg border border-[#00e676]/25 bg-[#00e676]/10 p-5">
            <h2 className="text-xl font-black text-white">Login to submit feedback</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              The reward is added to your account, so login or create an account first.
            </p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="mt-4 h-12 rounded-lg bg-[#00e676] px-5 text-sm font-black text-black hover:bg-[#35ff98]"
            >
              Login or sign up
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {isLoading && (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm font-bold text-white/55">
                <Loader2 className="h-4 w-4 animate-spin text-[#00e676]" />
                Loading your feedback
              </div>
            )}

            <div className="grid gap-3">
              {feedbackRows.map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.key} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00e676]/10 text-[#00e676]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-black text-white">{row.label}</h2>
                          <p className="mt-1 text-sm text-white/45">{row.hint}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 sm:w-72">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRatings((current) => ({ ...current, [row.key]: value }))}
                            className={`h-11 rounded-lg border text-sm font-black transition ${
                              ratings[row.key] === value
                                ? 'border-[#00e676] bg-[#00e676] text-black'
                                : 'border-white/10 bg-black/20 text-white/55 hover:border-[#00e676]/50 hover:text-white'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="block rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-white/45">
                <MessageSquareText className="h-4 w-4 text-[#00e676]" />
                Global comment
              </span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="What should we improve next?"
                className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-black/25 p-4 text-base text-white outline-none placeholder:text-white/30 focus:border-[#00e676]/70"
              />
            </label>

            {error && (
              <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm font-bold text-red-100">{error}</div>
            )}
            {notice && (
              <div className="rounded-lg border border-[#00e676]/25 bg-[#00e676]/10 p-3 text-sm font-bold text-[#b8ffd7]">{notice}</div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-14 w-full items-center justify-center rounded-lg bg-[#00e676] px-5 text-base font-black text-black hover:bg-[#35ff98] disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : hasExistingFeedback ? 'Update feedback' : `Submit feedback and get ${rewardDays} days`}
            </button>
          </form>
        )}
      </section>
    </main>
  );
};
