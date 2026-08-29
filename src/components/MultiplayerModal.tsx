import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Crown, Gamepad2, Globe2, Loader2, Mail, Medal, Mic2, Play, Plus, Share2, Tags, X } from 'lucide-react';
import { AuthSessionResponse } from '../adminTypes';
import { COUNTRIES } from '../data/countries';
import { ALL_SONGS, SNIPPET_TIERS, getSongsForCountry } from '../data/moroccanSongs';
import { Song } from '../types';
import {
  getArtistChallenges,
  getGenreChallenges,
  getSongsByArtistSlug,
  getSongsByGenreSlug,
  orderArtistsByFeaturedPriority
} from '../utils/challengeCatalog';
import { AudioSnippetPlayer } from './AudioSnippetPlayer';
import { GuessAutocomplete } from './GuessAutocomplete';

interface MultiplayerModalProps {
  onClose: () => void;
  isUnlocked: boolean;
  authSession: AuthSessionResponse;
  onOpenAuth: () => void;
  onOpenPaywall: () => void;
}

type MultiplayerMode = 'party' | 'online';
type SetupStep = 'setup' | 'players' | 'lobby' | 'play' | 'results';
type ChallengeType = 'country' | 'artist' | 'genre';

interface LocalPlayer {
  id: string;
  name: string;
  email?: string;
  score: number;
  correct: number;
  turnsPlayed: number;
  connected?: boolean;
}

interface ChallengeOption {
  type: ChallengeType;
  slug: string;
  title: string;
  subtitle: string;
  image?: string;
  songIds?: string[];
}

interface MultiplayerHistoryEntry {
  id: string;
  date: string;
  mode: MultiplayerMode;
  challengeTitle: string;
  turnsPerPlayer: number;
  players: LocalPlayer[];
}

interface OnlineRoom {
  code: string;
  hostName: string;
  players: LocalPlayer[];
  createdAt: number;
  settings?: {
    challengeType: ChallengeType;
    challengeSlug: string;
    challengeTitle: string;
    turnsPerPlayer: number;
  };
  activity?: string;
}

const MAX_PLAYERS = 10;
const FREE_TURNS_PER_PLAYER = 5;
const DEFAULT_TURNS = 3;
const HISTORY_KEY = 'song_guess_multiplayer_history_v1';

function createPlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeGuess(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function readHistory(): MultiplayerHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as MultiplayerHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entry: MultiplayerHistoryEntry): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...readHistory()].slice(0, 25)));
  } catch {}
}

function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/multiplayer`;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  onClose,
  isUnlocked,
  authSession,
  onOpenAuth,
  onOpenPaywall
}) => {
  const [mode, setMode] = useState<MultiplayerMode>('party');
  const [step, setStep] = useState<SetupStep>('setup');
  const [challengeType, setChallengeType] = useState<ChallengeType>('country');
  const [challengeSlug, setChallengeSlug] = useState('GLOBAL');
  const [turnsPerPlayer, setTurnsPerPlayer] = useState(DEFAULT_TURNS);
  const [players, setPlayers] = useState<LocalPlayer[]>([
    { id: createPlayerId(), name: 'Player 1', score: 0, correct: 0, turnsPlayed: 0 },
    { id: createPlayerId(), name: 'Player 2', score: 0, correct: 0, turnsPlayed: 0 }
  ]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [roundIndex, setRoundIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rounds, setRounds] = useState<Array<{ playerId: string; song: Song }>>([]);
  const [revealed, setRevealed] = useState<{ isCorrect: boolean; points: number; song: Song } | null>(null);
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [socketStatus, setSocketStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [onlinePlayerId, setOnlinePlayerId] = useState('');
  const [history, setHistory] = useState<MultiplayerHistoryEntry[]>(() => readHistory());
  const socketRef = useRef<WebSocket | null>(null);

  const challengeOptions = useMemo<ChallengeOption[]>(() => {
    if (challengeType === 'country') {
      return COUNTRIES.slice(0, 24).map((country) => ({
        type: 'country',
        slug: country.code,
        title: country.name,
        subtitle: country.description
      }));
    }
    if (challengeType === 'artist') {
      return orderArtistsByFeaturedPriority(getArtistChallenges()).slice(0, 24).map((artist) => ({
        type: 'artist',
        slug: artist.slug,
        title: artist.name,
        subtitle: `${artist.songsCount} songs`,
        image: artist.coverImage,
        songIds: artist.songIds
      }));
    }
    return getGenreChallenges().map((genre) => ({
      type: 'genre',
      slug: genre.slug,
      title: genre.name,
      subtitle: genre.description,
      image: genre.coverImage,
      songIds: genre.songIds
    }));
  }, [challengeType]);

  const selectedChallenge = useMemo(
    () => challengeOptions.find((item) => item.slug === challengeSlug) || challengeOptions[0],
    [challengeOptions, challengeSlug]
  );

  useEffect(() => {
    if (!challengeOptions.some((option) => option.slug === challengeSlug) && challengeOptions[0]) {
      setChallengeSlug(challengeOptions[0].slug);
    }
  }, [challengeOptions, challengeSlug]);

  const maxTurns = isUnlocked ? 25 : FREE_TURNS_PER_PLAYER;
  const safeTurns = Math.max(1, Math.min(maxTurns, turnsPerPlayer));
  const totalTurns = safeTurns * players.length;
  const currentRound = rounds[roundIndex];
  const currentPlayer = players.find((player) => player.id === currentRound?.playerId);
  const nextRound = rounds[roundIndex + 1];
  const nextPlayer = players.find((player) => player.id === nextRound?.playerId);
  const isOnlineGuest = mode === 'online' && Boolean(onlinePlayerId) && currentPlayer?.id !== onlinePlayerId;
  const isOnlineHost = mode === 'online' && Boolean(onlinePlayerId) && onlinePlayerId === players[0]?.id;

  const getSongPool = (): Song[] => {
    if (!selectedChallenge) return ALL_SONGS;
    if (selectedChallenge.type === 'country') return getSongsForCountry(selectedChallenge.slug);
    if (selectedChallenge.type === 'artist') {
      const byArtist = getSongsByArtistSlug(selectedChallenge.slug);
      return byArtist.length > 0 ? byArtist : ALL_SONGS.filter((song) => selectedChallenge.songIds?.includes(song.id));
    }
    const byGenre = getSongsByGenreSlug(selectedChallenge.slug);
    return byGenre.length > 0 ? byGenre : ALL_SONGS.filter((song) => selectedChallenge.songIds?.includes(song.id));
  };

  const buildRoomSettings = () => ({
    challengeType,
    challengeSlug: selectedChallenge?.slug || challengeSlug,
    challengeTitle: selectedChallenge?.title || 'Global',
    turnsPerPlayer: safeTurns
  });

  const addPlayer = () => {
    if (players.length >= MAX_PLAYERS) return;
    const name = newPlayerName.trim() || `Player ${players.length + 1}`;
    setPlayers((current) => [
      ...current,
      { id: createPlayerId(), name, email: newPlayerEmail.trim() || undefined, score: 0, correct: 0, turnsPlayed: 0 }
    ]);
    setNewPlayerName('');
    setNewPlayerEmail('');
  };

  const connectSocket = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return socketRef.current;
    setSocketStatus('connecting');
    const socket = new WebSocket(getWsUrl());
    socketRef.current = socket;
    socket.onopen = () => setSocketStatus('connected');
    socket.onerror = () => setSocketStatus('error');
    socket.onclose = () => setSocketStatus('idle');
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as {
          type: string;
          room?: OnlineRoom;
          playerId?: string;
          payload?: Record<string, unknown>;
        };
        if (message.type === 'room-created' || message.type === 'room-joined' || message.type === 'room-state') {
          if (message.room) {
            setRoom(message.room);
            setPlayers(message.room.players || []);
          }
          if (message.playerId) setOnlinePlayerId(message.playerId);
          setStep('lobby');
        }
        if (message.type === 'room-event' && message.payload) handleRoomEvent(message.payload);
      } catch {
        setSocketStatus('error');
      }
    };
    return socket;
  };

  const sendSocket = (message: Record<string, unknown>) => {
    const socket = connectSocket();
    const send = () => socket.send(JSON.stringify(message));
    if (socket.readyState === WebSocket.OPEN) send();
    else socket.addEventListener('open', send, { once: true });
  };

  const broadcast = (payload: Record<string, unknown>) => {
    if (mode !== 'online' || !room?.code) return;
    sendSocket({ type: 'room-event', roomCode: room.code, payload });
  };

  const createOnlineRoom = () => {
    if (!authSession.authenticated) {
      onOpenAuth();
      return;
    }
    if (!isUnlocked && turnsPerPlayer > FREE_TURNS_PER_PLAYER) {
      onOpenPaywall();
      return;
    }
    sendSocket({
      type: 'create-room',
      name: authSession.user?.name || 'Host',
      email: authSession.user?.email || '',
      settings: buildRoomSettings()
    });
  };

  const joinOnlineRoom = () => {
    if (!authSession.authenticated) {
      onOpenAuth();
      return;
    }
    sendSocket({
      type: 'join-room',
      roomCode: roomCodeInput.trim().toUpperCase(),
      name: authSession.user?.name || 'Player',
      email: authSession.user?.email || ''
    });
  };

  const startGame = () => {
    if (!isUnlocked && turnsPerPlayer > FREE_TURNS_PER_PLAYER) {
      onOpenPaywall();
      return;
    }
    const cleanPlayers = players.slice(0, MAX_PLAYERS).map((player) => ({
      ...player,
      score: 0,
      correct: 0,
      turnsPlayed: 0
    }));
    const pool = getSongPool();
    const selectedSongs = shuffle(pool).slice(0, Math.max(totalTurns, 1));
    const turnList = Array.from({ length: safeTurns }).flatMap((_, turn) =>
      cleanPlayers.map((player, playerIndex) => ({
        playerId: player.id,
        song: selectedSongs[(turn * cleanPlayers.length + playerIndex) % selectedSongs.length] || ALL_SONGS[0]
      }))
    );
    setPlayers(cleanPlayers);
    setRounds(turnList);
    setRoundIndex(0);
    setCurrentStepIndex(0);
    setRevealed(null);
    setStep('play');
    broadcast({ type: 'start-game', rounds: turnList, settings: buildRoomSettings(), players: cleanPlayers });
  };

  const finishGame = (finalPlayers: LocalPlayer[]) => {
    const entry = {
      id: `mp-${Date.now()}`,
      date: new Date().toISOString(),
      mode,
      challengeTitle: selectedChallenge?.title || room?.settings?.challengeTitle || 'Multiplayer',
      turnsPerPlayer: safeTurns,
      players: [...finalPlayers].sort((left, right) => right.score - left.score)
    };
    saveHistory(entry);
    setHistory(readHistory());
    setStep('results');
  };

  const handleRoomEvent = (payload: Record<string, unknown>) => {
    if (payload.type === 'start-game') {
      setRounds((payload.rounds as Array<{ playerId: string; song: Song }>) || []);
      setPlayers((payload.players as LocalPlayer[]) || []);
      setRoundIndex(0);
      setCurrentStepIndex(0);
      setRevealed(null);
      setStep('play');
    }
    if (payload.type === 'activity') {
      setRoom((current) => current ? { ...current, activity: String(payload.message || '') } : current);
    }
    if (payload.type === 'round-result') {
      const nextPlayers = (payload.players as LocalPlayer[]) || [];
      if (nextPlayers.length) setPlayers(nextPlayers);
      setRevealed(payload.revealed as { isCorrect: boolean; points: number; song: Song });
    }
    if (payload.type === 'next-round') {
      setRoundIndex(Number(payload.roundIndex || 0));
      setCurrentStepIndex(0);
      setRevealed(null);
    }
    if (payload.type === 'finish') {
      const nextPlayers = (payload.players as LocalPlayer[]) || players;
      setPlayers(nextPlayers);
      finishGame(nextPlayers);
    }
  };

  const currentPoints = SNIPPET_TIERS[currentStepIndex]?.points || 0;

  const scoreRound = (isCorrect: boolean, points: number) => {
    if (!currentRound || !currentPlayer) return;
    const nextPlayers = players.map((player) =>
      player.id === currentPlayer.id
        ? {
            ...player,
            score: player.score + points,
            correct: player.correct + (isCorrect ? 1 : 0),
            turnsPlayed: player.turnsPlayed + 1
          }
        : player
    );
    const nextReveal = { isCorrect, points, song: currentRound.song };
    setPlayers(nextPlayers);
    setRevealed(nextReveal);
    broadcast({ type: 'round-result', players: nextPlayers, revealed: nextReveal });
  };

  const handleGuess = (song: Song) => {
    if (isOnlineGuest || !currentRound) return;
    const exact =
      song.id === currentRound.song.id ||
      (normalizeGuess(song.title) === normalizeGuess(currentRound.song.title) &&
        normalizeGuess(currentRound.song.artist).includes(normalizeGuess(song.artist).slice(0, 4)));
    scoreRound(exact, exact ? currentPoints : 0);
    broadcast({
      type: 'activity',
      message: `${currentPlayer?.name || 'Player'} guessed ${exact ? 'correctly' : 'wrong'} at ${SNIPPET_TIERS[currentStepIndex]?.label}.`
    });
  };

  const handleSkip = () => {
    if (isOnlineGuest) return;
    if (currentStepIndex < SNIPPET_TIERS.length - 1) {
      const nextStep = currentStepIndex + 1;
      setCurrentStepIndex(nextStep);
      broadcast({ type: 'activity', message: `${currentPlayer?.name || 'Player'} listened to ${SNIPPET_TIERS[nextStep]?.label}.` });
      return;
    }
    scoreRound(false, 0);
  };

  const nextTurn = () => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= rounds.length) {
      finishGame(players);
      broadcast({ type: 'finish', players });
      return;
    }
    setRoundIndex(nextIndex);
    setCurrentStepIndex(0);
    setRevealed(null);
    broadcast({ type: 'next-round', roundIndex: nextIndex });
  };

  const copyRoomInvite = () => {
    const code = room?.code || roomCodeInput;
    const text = `Join my Song Guess Game room ${code}: ${window.location.origin}/play?room=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(text).catch(() => undefined);
  };

  const rankedPlayers = useMemo(
    () => [...players].sort((left, right) => right.score - left.score || left.name.localeCompare(right.name)),
    [players]
  );

  useEffect(() => () => socketRef.current?.close(), []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/12 bg-[#0d1410] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00e676]/15 text-[#00e676]">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black text-white">Multiplayer Song Guess</h2>
              <p className="mt-1 text-xs text-white/50">Same-device party or real-time room code. Up to 10 players.</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
            {(['party', 'online'] as const).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setMode(item);
                  setStep('setup');
                }}
                className={`h-10 rounded-md text-xs font-black ${mode === item ? 'bg-[#00e676] text-black' : 'text-white/55 hover:text-white'}`}
              >
                {item === 'party' ? 'Same device' : 'Online room'}
              </button>
            ))}
          </div>

          {step === 'setup' && (
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
              <section className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['country', Globe2, 'Country'],
                    ['artist', Mic2, 'Artist'],
                    ['genre', Tags, 'Genre']
                  ].map(([type, Icon, label]) => (
                    <button
                      key={String(type)}
                      onClick={() => {
                        setChallengeType(type as ChallengeType);
                        setChallengeSlug('');
                      }}
                      className={`flex h-12 items-center justify-center gap-2 rounded-lg border text-xs font-black ${
                        challengeType === type ? 'border-[#00e676] bg-[#00e676] text-black' : 'border-white/10 bg-white/[0.04] text-white/65 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid max-h-[430px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {challengeOptions.map((option) => (
                    <button
                      key={option.slug}
                      onClick={() => setChallengeSlug(option.slug)}
                      className={`grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 rounded-lg border p-2 text-left ${
                        selectedChallenge?.slug === option.slug ? 'border-[#00e676] bg-[#00e676]/12' : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                      }`}
                    >
                      <div className="flex h-13 w-13 items-center justify-center overflow-hidden rounded-lg bg-black/30 text-xl">
                        {option.image ? <img src={option.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : option.slug === 'GLOBAL' ? '🌍' : COUNTRIES.find((country) => country.code === option.slug)?.flag || '♪'}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-white">{option.title}</div>
                        <div className="truncate text-[11px] text-white/45">{option.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <aside className="rounded-lg border border-white/10 bg-[#111915] p-4">
                <h3 className="text-sm font-black text-white">Challenge setup</h3>
                <label className="mt-4 block text-[11px] font-black uppercase tracking-wide text-white/45">Songs per player</label>
                <input
                  type="number"
                  min={1}
                  max={maxTurns}
                  value={turnsPerPlayer}
                  onChange={(event) => setTurnsPerPlayer(Math.max(1, Math.min(maxTurns, Number(event.target.value) || 1)))}
                  className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#0b100d] px-3 text-white outline-none focus:border-[#00e676]"
                />
                <p className="mt-2 text-xs text-white/45">
                  Free games allow up to 5 songs per player. Longer rooms need the premium player to create the challenge.
                </p>
                {!isUnlocked && (
                  <button onClick={onOpenPaywall} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#00e676]/35 bg-[#00e676]/10 text-xs font-black text-[#00e676]">
                    <Crown className="h-4 w-4" />
                    Unlock longer games
                  </button>
                )}
                <button
                  onClick={() => setStep(mode === 'party' ? 'players' : 'lobby')}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00e676] text-sm font-black text-black hover:bg-[#1fe682]"
                >
                  Continue
                  <Play className="h-4 w-4 fill-black" />
                </button>
              </aside>
            </div>
          )}

          {step === 'players' && (
            <section className="mt-5">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input value={newPlayerName} onChange={(event) => setNewPlayerName(event.target.value)} placeholder="Player name" className="h-11 rounded-lg border border-white/10 bg-[#141c17] px-3 text-sm text-white outline-none focus:border-[#00e676]" />
                <input value={newPlayerEmail} onChange={(event) => setNewPlayerEmail(event.target.value)} placeholder="Email optional" className="h-11 rounded-lg border border-white/10 bg-[#141c17] px-3 text-sm text-white outline-none focus:border-[#00e676]" />
                <button onClick={addPlayer} disabled={players.length >= MAX_PLAYERS} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00e676] px-4 text-xs font-black text-black disabled:opacity-40">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {players.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{index + 1}. {player.name}</p>
                      <p className="truncate text-[11px] text-white/40">{player.email || 'Same-device player'}</p>
                    </div>
                    {players.length > 2 && (
                      <button onClick={() => setPlayers((current) => current.filter((item) => item.id !== player.id))} className="text-xs font-bold text-red-300 hover:text-red-100">
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setStep('setup')} className="h-11 rounded-lg border border-white/10 px-4 text-sm font-bold text-white/65 hover:bg-white/10">Back</button>
                <button onClick={startGame} className="h-11 flex-1 rounded-lg bg-[#00e676] text-sm font-black text-black hover:bg-[#1fe682]">
                  Start {players.length} player game
                </button>
              </div>
            </section>
          )}

          {step === 'lobby' && (
            <section className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <h3 className="text-sm font-black text-white">Create room</h3>
                {!authSession.authenticated && (
                  <button onClick={onOpenAuth} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#00e676] text-xs font-black text-black">
                    <Mail className="h-4 w-4" />
                    Login to create room
                  </button>
                )}
                {authSession.authenticated && !room && (
                  <button onClick={createOnlineRoom} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#00e676] text-xs font-black text-black">
                    {socketStatus === 'connecting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gamepad2 className="h-4 w-4" />}
                    Create room code
                  </button>
                )}
                {room && (
                  <div className="mt-3 rounded-lg bg-black/30 p-3">
                    <div className="text-xs font-bold text-white/45">Room code</div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="font-mono text-2xl font-black text-[#00e676]">{room.code}</span>
                      <button onClick={copyRoomInvite} className="flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-black text-white/70">
                        <Share2 className="h-4 w-4" /> Share
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <h3 className="text-sm font-black text-white">Join room</h3>
                <input value={roomCodeInput} onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())} placeholder="ROOM CODE" className="mt-3 h-11 w-full rounded-lg border border-white/10 bg-[#141c17] px-3 font-mono text-white outline-none focus:border-[#00e676]" />
                <button onClick={joinOnlineRoom} className="mt-3 h-10 w-full rounded-lg border border-[#00e676]/35 bg-[#00e676]/10 text-xs font-black text-[#00e676]">
                  Join real-time room
                </button>
              </div>
              {room && (
                <div className="lg:col-span-2 rounded-lg border border-white/10 bg-[#111915] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-white">Lobby players</h3>
                    <span className="text-xs text-white/45">{players.length}/{MAX_PLAYERS}</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {players.map((player) => (
                      <div key={player.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm font-black text-white">
                        {player.name}
                      </div>
                    ))}
                  </div>
                  {isOnlineHost && (
                    <button onClick={startGame} className="mt-4 h-11 w-full rounded-lg bg-[#00e676] text-sm font-black text-black">
                      Start online game
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {step === 'play' && currentRound && currentPlayer && (
            <section className="mt-5">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="grid gap-2 text-xs sm:grid-cols-4">
                  <Info label="Current round" value={`${roundIndex + 1}/${rounds.length} - ${currentPlayer.name}`} />
                  <Info label="Activity" value={room?.activity || `${currentPlayer.name} is listening`} />
                  <Info label="Next player" value={nextPlayer?.name || 'Final results'} />
                  <button className="rounded-lg border border-[#00e676]/30 bg-[#00e676]/10 px-3 py-2 font-black text-[#00e676]">Ranking</button>
                </div>
              </div>

              <div className="mt-5 text-center">
                <div className="text-xs font-black uppercase tracking-wide text-[#00e676]">Turn for</div>
                <h3 className="mt-1 text-3xl font-black text-white">{currentPlayer.name}</h3>
                {isOnlineGuest && <p className="mt-2 text-sm font-bold text-white/55">Listen along. Only this round player can guess.</p>}
              </div>

              {!revealed ? (
                <div className="mx-auto max-w-lg">
                  <AudioSnippetPlayer song={currentRound.song} currentStepIndex={currentStepIndex} difficulty={currentRound.song.difficulty} />
                  <GuessAutocomplete
                    onGuess={handleGuess}
                    onSkip={handleSkip}
                    disabled={isOnlineGuest}
                    countryCode="GLOBAL"
                    titleDisplayMode="both"
                    isLastStep={currentStepIndex >= SNIPPET_TIERS.length - 1}
                    nextStepLabel={SNIPPET_TIERS[currentStepIndex + 1]?.label}
                  />
                </div>
              ) : (
                <div className="mx-auto mt-6 max-w-lg rounded-lg border border-white/10 bg-[#111915] p-5 text-center">
                  <img src={revealed.song.artworkUrl} alt="" className="mx-auto h-28 w-28 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  <h3 className="mt-4 text-2xl font-black text-white">{revealed.song.title}</h3>
                  <p className="text-sm text-white/55">{revealed.song.artist}</p>
                  <p className={`mt-3 text-lg font-black ${revealed.isCorrect ? 'text-[#00e676]' : 'text-red-300'}`}>
                    {revealed.isCorrect ? `+${revealed.points} points` : 'No points'}
                  </p>
                  {(mode === 'party' || isOnlineHost) && (
                    <button onClick={nextTurn} className="mt-4 h-11 w-full rounded-lg bg-[#00e676] text-sm font-black text-black">
                      {roundIndex + 1 >= rounds.length ? 'Show results' : 'Next player'}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {step === 'results' && (
            <section className="mt-5">
              <h3 className="text-center text-3xl font-black text-white">Final ranking</h3>
              <div className="mt-5 space-y-2">
                {rankedPlayers.map((player, index) => (
                  <div key={player.id} className={`flex items-center justify-between rounded-lg border p-4 ${
                    index === 0 ? 'border-yellow-300/60 bg-yellow-300/10' : index === 1 ? 'border-slate-300/50 bg-slate-300/10' : index === 2 ? 'border-amber-700/60 bg-amber-700/10' : 'border-white/10 bg-white/[0.04]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <RankIcon rank={index + 1} />
                      <div>
                        <p className="font-black text-white">{player.name}</p>
                        <p className="text-xs text-white/45">{player.correct}/{player.turnsPlayed} correct</p>
                      </div>
                    </div>
                    <span className="font-mono text-lg font-black text-[#00e676]">{player.score} pts</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button onClick={() => setStep('setup')} className="h-11 rounded-lg border border-white/10 text-sm font-bold text-white/65 hover:bg-white/10">New setup</button>
                <button onClick={startGame} className="h-11 rounded-lg bg-[#00e676] text-sm font-black text-black">Play again</button>
              </div>
              {history.length > 0 && (
                <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <h4 className="text-sm font-black text-white">Saved history</h4>
                  <div className="mt-3 max-h-36 space-y-2 overflow-y-auto">
                    {history.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex justify-between gap-3 text-xs text-white/55">
                        <span>{entry.challengeTitle}</span>
                        <span>{entry.players[0]?.name} won</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-white/35">{label}</div>
      <div className="mt-1 truncate font-bold text-white/80">{value}</div>
    </div>
  );
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="h-7 w-7 fill-yellow-300/20 text-yellow-300" />;
  if (rank === 2) return <Medal className="h-7 w-7 fill-slate-300/20 text-slate-300" />;
  if (rank === 3) return <Medal className="h-7 w-7 fill-amber-700/20 text-amber-700" />;
  return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white/55">#{rank}</span>;
}
