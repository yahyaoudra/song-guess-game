import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Crown, Gamepad2, Globe2, Loader2, Lock, Mail, Mic2, Play, Plus, Share2, Tags, Users, Wifi, X } from 'lucide-react';
import { AuthSessionResponse } from '../adminTypes';
import { COUNTRIES } from '../data/countries';
import { ALL_SONGS, getSongsForCountry } from '../data/moroccanSongs';
import { QUIZ_COLLECTIONS } from '../data/quizCollections';
import { MultiplayerPlayer, MultiplayerRound, MultiplayerSession, QuizCollection, Song } from '../types';
import {
  getArtistChallenges,
  getGenreChallenges,
  getSongsByArtistSlug,
  getSongsByGenreSlug,
  orderArtistsByFeaturedPriority
} from '../utils/challengeCatalog';

interface MultiplayerModalProps {
  onClose: () => void;
  isUnlocked: boolean;
  authSession: AuthSessionResponse;
  onOpenAuth: (returnTo?: 'online-create' | 'online-join') => void;
  onOpenPaywall: () => void;
  onStartSession: (session: MultiplayerSession) => void;
  initialRoomCode?: string;
  initialMode?: MultiplayerMode;
  initialStep?: SetupStep;
  activeCollection?: QuizCollection | null;
  existingSession?: MultiplayerSession | null;
}

type MultiplayerMode = 'party' | 'online';
type SetupStep = 'mode' | 'setup' | 'players' | 'lobby';
type ChallengeType = 'country' | 'artist' | 'genre' | 'collection';

interface ChallengeOption {
  type: ChallengeType;
  slug: string;
  title: string;
  subtitle: string;
  image?: string;
  songIds?: string[];
}

interface OnlineRoom {
  code: string;
  hostName: string;
  players: MultiplayerPlayer[];
  createdAt: number;
  settings?: {
    challengeType: ChallengeType;
    challengeSlug: string;
    challengeTitle: string;
    turnsPerPlayer: number;
    hostHasUnlimited?: boolean;
  };
  activity?: string;
  status?: 'lobby' | 'playing' | 'finished';
  startedPayload?: {
    type?: string;
    rounds?: MultiplayerRound[];
    players?: MultiplayerPlayer[];
    settings?: OnlineRoom['settings'];
  };
}

const MAX_PLAYERS = 10;
const FREE_TURNS_PER_PLAYER = 5;
const DEFAULT_TURNS = 3;

function createPlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
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
  onOpenPaywall,
  onStartSession,
  initialRoomCode = '',
  initialMode = 'party',
  initialStep,
  activeCollection = null,
  existingSession = null
}) => {
  const existingOnlineRoom = existingSession?.mode === 'online' && existingSession.roomCode
    ? {
        code: existingSession.roomCode,
        hostName: existingSession.players[0]?.name || 'Host',
        players: existingSession.players,
        createdAt: existingSession.startedAt,
        settings: {
          challengeType: existingSession.challengeType,
          challengeSlug: '',
          challengeTitle: existingSession.challengeTitle,
          turnsPerPlayer: existingSession.turnsPerPlayer,
          hostHasUnlimited: Boolean(existingSession.hostHasUnlimited)
        },
        activity: existingSession.activity,
        status: existingSession.completed ? 'finished' as const : 'playing' as const,
        startedPayload: existingSession.completed ? undefined : {
          type: 'start-game',
          rounds: existingSession.rounds,
          players: existingSession.players
        }
      }
    : null;
  const [mode, setMode] = useState<MultiplayerMode>(existingOnlineRoom || initialRoomCode ? 'online' : initialMode);
  const [step, setStep] = useState<SetupStep>(initialStep || (initialRoomCode ? 'lobby' : 'mode'));
  const [challengeType, setChallengeType] = useState<ChallengeType>(activeCollection ? 'collection' : existingSession?.challengeType || 'country');
  const [challengeSlug, setChallengeSlug] = useState(activeCollection?.id || 'GLOBAL');
  const [turnsPerPlayer, setTurnsPerPlayer] = useState(DEFAULT_TURNS);
  const [players, setPlayers] = useState<MultiplayerPlayer[]>([
    ...(existingSession?.players.length ? existingSession.players : [
      { id: createPlayerId(), name: 'Player 1', score: 0, correct: 0, turnsPlayed: 0 },
      { id: createPlayerId(), name: 'Player 2', score: 0, correct: 0, turnsPlayed: 0 }
    ])
  ]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [room, setRoom] = useState<OnlineRoom | null>(existingOnlineRoom);
  const [roomCodeInput, setRoomCodeInput] = useState((existingOnlineRoom?.code || initialRoomCode).toUpperCase());
  const [onlinePlayerId, setOnlinePlayerId] = useState(existingSession?.onlinePlayerId || '');
  const [socketStatus, setSocketStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isRoomInfoOpen, setIsRoomInfoOpen] = useState(false);
  const socketRef = useRef<WebSocket | null>(existingSession?.socket || null);
  const handoffSocketRef = useRef(false);

  const challengeOptions = useMemo<ChallengeOption[]>(() => {
    if (challengeType === 'collection') {
      const collection = activeCollection || QUIZ_COLLECTIONS.find((item) => item.id === challengeSlug) || QUIZ_COLLECTIONS[0];
      return collection
        ? [{
            type: 'collection',
            slug: collection.id,
            title: collection.title,
            subtitle: `${collection.songIds.length || collection.songsCount || 0} songs`,
            image: collection.coverImage,
            songIds: collection.songIds
          }]
        : [];
    }
    if (challengeType === 'country') {
      return COUNTRIES.slice(0, 24).map((country) => ({
        type: 'country',
        slug: country.code,
        title: country.name,
        subtitle: country.description
      }));
    }
    if (challengeType === 'artist') {
      return orderArtistsByFeaturedPriority(getArtistChallenges()).slice(0, 36).map((artist) => ({
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
  }, [activeCollection, challengeSlug, challengeType]);

  const selectedChallenge = useMemo(
    () => challengeOptions.find((item) => item.slug === challengeSlug) || challengeOptions[0],
    [challengeOptions, challengeSlug]
  );

  useEffect(() => {
    if (!challengeOptions.some((option) => option.slug === challengeSlug) && challengeOptions[0]) {
      setChallengeSlug(challengeOptions[0].slug);
    }
  }, [challengeOptions, challengeSlug]);

  useEffect(() => {
    if (!activeCollection || initialRoomCode) return;
    setChallengeType('collection');
    setChallengeSlug(activeCollection.id);
  }, [activeCollection, initialRoomCode]);

  useEffect(() => {
    if (initialRoomCode) {
      setMode('online');
      setStep(initialStep || 'lobby');
      setRoomCodeInput(initialRoomCode.toUpperCase());
    }
  }, [initialRoomCode, initialStep]);

  useEffect(() => {
    if (!initialRoomCode) {
      setMode(initialMode);
      setStep(initialStep || 'mode');
    }
  }, [initialMode, initialRoomCode, initialStep]);

  useEffect(() => () => {
    if (!handoffSocketRef.current) socketRef.current?.close();
  }, []);

  const maxTurns = isUnlocked ? 25 : FREE_TURNS_PER_PLAYER;
  const safeTurns = Math.max(1, Math.min(maxTurns, turnsPerPlayer));
  const isOnlineHost = mode === 'online' && Boolean(onlinePlayerId) && onlinePlayerId === players[0]?.id;
  const normalizedRoomCodeInput = roomCodeInput.trim().toUpperCase();
  const isJoinedInRequestedRoom = Boolean(room && onlinePlayerId && room.code === normalizedRoomCodeInput);
  const onlineStablePlayerId = authSession.user?.id ? `user-${authSession.user.id}` : onlinePlayerId;

  const getSongPool = (): Song[] => {
    if (!selectedChallenge) return ALL_SONGS;
    if (selectedChallenge.type === 'country') return getSongsForCountry(selectedChallenge.slug);
    if (selectedChallenge.type === 'collection') {
      const collection = activeCollection || QUIZ_COLLECTIONS.find((item) => item.id === selectedChallenge.slug);
      const byIds = ALL_SONGS.filter((song) => collection?.songIds.includes(song.id));
      return byIds.length > 0 ? byIds : collection?.songs || ALL_SONGS;
    }
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
    turnsPerPlayer: safeTurns,
    hostHasUnlimited: isUnlocked
  });

  const buildRounds = (sessionPlayers: MultiplayerPlayer[]): MultiplayerRound[] => {
    const cleanPlayers = sessionPlayers.slice(0, MAX_PLAYERS);
    const pool = getSongPool();
    const selectedSongs = shuffle(pool.length > 0 ? pool : ALL_SONGS).slice(0, Math.max(safeTurns * cleanPlayers.length, 1));
    return Array.from({ length: safeTurns }).flatMap((_, turn) =>
      cleanPlayers.map((player, playerIndex) => ({
        playerId: player.id,
        song: selectedSongs[(turn * cleanPlayers.length + playerIndex) % selectedSongs.length] || ALL_SONGS[0]
      }))
    );
  };

  const createSession = (
    sessionPlayers: MultiplayerPlayer[],
    rounds: MultiplayerRound[],
    roomCode?: string,
    settingsOverride?: OnlineRoom['settings']
  ): MultiplayerSession => ({
    id: `mp-${Date.now()}`,
    mode,
    roomCode,
    socket: mode === 'online' ? socketRef.current || undefined : undefined,
    onlinePlayerId,
    isHost: mode === 'party' || isOnlineHost,
    hostHasUnlimited: Boolean(settingsOverride?.hostHasUnlimited || room?.settings?.hostHasUnlimited || (mode === 'party' && isUnlocked)),
    challengeTitle: settingsOverride?.challengeTitle || room?.settings?.challengeTitle || selectedChallenge?.title || 'Multiplayer',
    challengeType: (settingsOverride?.challengeType as ChallengeType | undefined) || (room?.settings?.challengeType as ChallengeType | undefined) || challengeType,
    turnsPerPlayer: settingsOverride?.turnsPerPlayer || room?.settings?.turnsPerPlayer || safeTurns,
    players: sessionPlayers.map((player) => ({ ...player, score: 0, correct: 0, turnsPlayed: 0 })),
    rounds,
    activity: `${sessionPlayers[0]?.name || 'Player'} starts the challenge`,
    startedAt: Date.now()
  });

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
          error?: string;
        };
        if (message.type === 'error') {
          setRoomError(message.error || 'Room request failed');
          setIsJoiningRoom(false);
          setIsCreatingRoom(false);
          return;
        }
        if (message.type === 'room-created' || message.type === 'room-joined' || message.type === 'room-state') {
          if (message.room) {
            setRoom(message.room);
            setPlayers((message.room.players || []).slice(0, MAX_PLAYERS));
          }
          if (message.playerId) setOnlinePlayerId(message.playerId);
          setRoomError('');
          setIsJoiningRoom(false);
          setIsCreatingRoom(false);
          setStep('lobby');
        }
        if (message.type === 'room-event' && message.payload?.type === 'start-game') {
          const roomPlayers = (message.payload.players as MultiplayerPlayer[]) || players;
          const rounds = (message.payload.rounds as MultiplayerRound[]) || [];
          const settings = message.payload.settings as OnlineRoom['settings'] | undefined;
          handoffSocketRef.current = true;
          onStartSession(createSession(roomPlayers, rounds, room?.code || roomCodeInput, settings));
          onClose();
        }
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

  const startLocalGame = () => {
    if (!isUnlocked && turnsPerPlayer > FREE_TURNS_PER_PLAYER) {
      onOpenPaywall();
      return;
    }
    const sessionPlayers = players.slice(0, MAX_PLAYERS);
    onStartSession(createSession(sessionPlayers, buildRounds(sessionPlayers)));
    onClose();
  };

  const createOnlineRoom = () => {
    if (!authSession.authenticated) {
      onOpenAuth('online-create');
      return;
    }
    if (!isUnlocked && turnsPerPlayer > FREE_TURNS_PER_PLAYER) {
      onOpenPaywall();
      return;
    }
    setIsCreatingRoom(true);
    setRoomError('');
    sendSocket({
      type: 'create-room',
      playerId: onlineStablePlayerId || createPlayerId(),
      name: authSession.user?.name || 'Host',
      email: authSession.user?.email || '',
      settings: buildRoomSettings()
    });
  };

  const joinOnlineRoom = () => {
    if (!authSession.authenticated) {
      onOpenAuth('online-join');
      return;
    }
    const code = normalizedRoomCodeInput;
    if (!code) return;
    if (isJoinedInRequestedRoom || isJoiningRoom) return;
    setIsJoiningRoom(true);
    setRoomError('');
    sendSocket({
      type: 'join-room',
      roomCode: code,
      playerId: onlineStablePlayerId || createPlayerId(),
      name: authSession.user?.name || 'Player',
      email: authSession.user?.email || ''
    });
  };

  const enterStartedOnlineGame = () => {
    const payload = room?.startedPayload;
    const roomPlayers = payload?.players || players;
    const rounds = payload?.rounds || [];
    if (!room || !onlinePlayerId || rounds.length === 0) return;
    handoffSocketRef.current = true;
    onStartSession(createSession(roomPlayers, rounds, room.code));
    onClose();
  };

  const handleClose = () => {
    if (room?.status === 'playing' && room.startedPayload && onlinePlayerId) {
      enterStartedOnlineGame();
      return;
    }
    onClose();
  };

  const startOnlineGame = () => {
    if (!room || !isOnlineHost) return;
    const sessionPlayers = players.slice(0, MAX_PLAYERS).map((player) => ({
      ...player,
      score: 0,
      correct: 0,
      turnsPlayed: 0,
      connected: player.connected !== false
    }));
    const rounds = buildRounds(sessionPlayers);
    const settings = buildRoomSettings();
    sendSocket({
      type: 'room-event',
      roomCode: room.code,
      payload: { type: 'start-game', rounds, settings, players: sessionPlayers }
    });
    setRoom((current) => current ? { ...current, settings, status: 'playing', startedPayload: { type: 'start-game', rounds, settings, players: sessionPlayers } } : current);
    handoffSocketRef.current = true;
    onStartSession(createSession(sessionPlayers, rounds, room.code, settings));
    onClose();
  };

  const copyRoomInvite = () => {
    const code = room?.code || roomCodeInput;
    const text = `Join my Song Guess Game room ${code}: ${window.location.origin}/play?room=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 1800);
    }).catch(() => undefined);
  };

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
              <p className="mt-1 text-xs text-white/50">Set up the lobby here. The game plays on the main screen.</p>
            </div>
          </div>
          <button onClick={handleClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          {step === 'mode' && (
            <section className="grid gap-3 sm:grid-cols-2">
              <button onClick={() => { setMode('party'); setStep('setup'); }} className="rounded-lg border border-[#00e676]/35 bg-[#00e676]/10 p-5 text-left hover:bg-[#00e676]/15">
                <Users className="h-7 w-7 text-[#00e676]" />
                <h3 className="mt-4 text-xl font-black text-white">Same device</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">Add names, pass the device, and play equal turns together.</p>
              </button>
              <button onClick={() => { setMode('online'); setStep('lobby'); }} className="rounded-lg border border-white/12 bg-white/[0.045] p-5 text-left hover:border-[#00e676]/45">
                <Wifi className="h-7 w-7 text-[#00e676]" />
                <h3 className="mt-4 text-xl font-black text-white">Online room</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">Create a room code or join one after login.</p>
              </button>
            </section>
          )}

          {step === 'setup' && (
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <section className="space-y-4">
                {activeCollection && (
                  <button
                    onClick={() => {
                      setChallengeType('collection');
                      setChallengeSlug(activeCollection.id);
                    }}
                    className={`grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-2.5 text-left ${
                      challengeType === 'collection' ? 'border-[#00e676] bg-[#00e676]/12' : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                    }`}
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-lg bg-black/30">
                      <img src={activeCollection.coverImage} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-white">Selected pack: {activeCollection.title}</div>
                      <div className="truncate text-xs text-white/45">{activeCollection.songIds.length || activeCollection.songsCount || 0} playable songs</div>
                    </div>
                    <span className="rounded-full bg-[#00e676]/15 px-2 py-1 text-[10px] font-black text-[#00e676]">Use pack</span>
                  </button>
                )}
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
                      <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-lg bg-black/30 text-xl">
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
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-black text-white/55">
                  {mode === 'party' ? <Users className="h-3.5 w-3.5 text-[#00e676]" /> : <Wifi className="h-3.5 w-3.5 text-[#00e676]" />}
                  {mode === 'party' ? 'Same device' : 'Online room'}
                </div>
                <h3 className="mt-3 text-sm font-black text-white">Game settings</h3>
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
                  Free games allow up to 5 songs per player. If the room creator has unlimited access, everyone can play inside that room.
                </p>
                {!isUnlocked && (
                  <button onClick={onOpenPaywall} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#00e676]/35 bg-[#00e676]/10 text-xs font-black text-[#00e676]">
                    <Crown className="h-4 w-4" />
                    Unlock longer games
                  </button>
                )}
                <button
                  onClick={() => mode === 'party' ? setStep('players') : room ? startOnlineGame() : createOnlineRoom()}
                  disabled={mode === 'online' && isCreatingRoom}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00e676] text-sm font-black text-black hover:bg-[#1fe682] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {mode === 'online' && isCreatingRoom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-black" />}
                  {mode === 'online' ? room ? 'Start in same room' : 'Create room code' : 'Continue'}
                </button>
              </aside>
            </div>
          )}

          {step === 'players' && (
            <section>
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
                <button onClick={startLocalGame} className="h-11 flex-1 rounded-lg bg-[#00e676] text-sm font-black text-black hover:bg-[#1fe682]">
                  Start on main screen
                </button>
              </div>
            </section>
          )}

          {step === 'lobby' && (
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <h3 className="text-sm font-black text-white">Create new game</h3>
                {!authSession.authenticated ? (
                  <button type="button" onClick={() => onOpenAuth('online-create')} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#00e676] text-xs font-black text-black">
                    <Lock className="h-4 w-4" />
                    Login or sign up
                  </button>
                ) : !room ? (
                  <div className="mt-3 grid gap-2">
                    <button type="button" onClick={() => setStep('setup')} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#00e676] text-xs font-black text-black">
                      <Gamepad2 className="h-4 w-4" />
                      Choose challenge and songs
                    </button>
                    <p className="text-xs text-white/45">Pick country, artist, or genre first, then Song Guess creates a shareable room code.</p>
                    {!isUnlocked && (
                      <p className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-2 text-xs font-bold text-amber-100">
                        If players already used their free Daily 5, the room creator needs unlimited access for everyone to keep playing in this room.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg bg-black/30 p-3">
                    <div className="text-xs font-bold text-white/45">Room code</div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="font-mono text-2xl font-black text-[#00e676]">{room.code}</span>
                      <button type="button" onClick={copyRoomInvite} className="flex h-9 items-center gap-2 rounded-lg border border-[#00e676]/35 bg-[#00e676]/10 px-3 text-xs font-black text-[#00e676] hover:bg-[#00e676]/20 hover:text-white">
                        {copiedInvite ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                        {copiedInvite ? 'Copied' : 'Share'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <h3 className="text-sm font-black text-white">Join with room code</h3>
                {!authSession.authenticated && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-white/45"><Mail className="h-3.5 w-3.5" /> Online rooms require login.</p>
                )}
                <input value={roomCodeInput} onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())} placeholder="ROOM CODE" className="mt-3 h-11 w-full rounded-lg border border-white/10 bg-[#141c17] px-3 font-mono text-white outline-none focus:border-[#00e676]" />
                <button
                  type="button"
                  onClick={joinOnlineRoom}
                  disabled={isJoiningRoom || isJoinedInRequestedRoom}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#00e676]/35 bg-[#00e676]/10 text-xs font-black text-[#00e676] hover:bg-[#00e676]/20 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isJoiningRoom && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isJoinedInRequestedRoom ? 'Already in room' : 'Join room'}
                </button>
              </div>

              {roomError && (
                <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-xs font-bold text-red-100 lg:col-span-2">
                  {roomError}
                </div>
              )}

              {room && (
                <div className="rounded-lg border border-white/10 bg-[#111915] p-4 lg:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-white">Lobby</h3>
                    <span className="text-xs text-white/45">{players.length}/{MAX_PLAYERS}</span>
                  </div>
                  {room.activity && <p className="mt-2 text-xs text-white/45">{room.activity}</p>}
                  {!room.settings?.hostHasUnlimited && (
                    <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
                      <p className="text-xs font-bold text-amber-100">
                        This room uses each player&apos;s free Daily 5. For everyone to play unlimited in this room, the room creator needs unlimited access.
                      </p>
                      {isOnlineHost && (
                        <button
                          type="button"
                          onClick={onOpenPaywall}
                          className="mt-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#00e676] px-3 text-xs font-black text-black hover:bg-[#1fe682]"
                        >
                          <Crown className="h-4 w-4" />
                          Unlock unlimited
                        </button>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {players.map((player) => (
                      <span key={player.id} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-white">
                        {player.name}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <button type="button" onClick={copyRoomInvite} className="h-11 rounded-lg border border-[#00e676]/35 bg-[#00e676]/10 text-sm font-black text-[#00e676] hover:bg-[#00e676]/20">
                      {copiedInvite ? 'Invite copied' : 'Share invite'}
                    </button>
                    <button type="button" onClick={() => setIsRoomInfoOpen((current) => !current)} className="h-11 rounded-lg border border-white/10 bg-white/[0.04] text-sm font-black text-white/70 hover:bg-white/10">
                      Room info
                    </button>
                    {room.status === 'playing' && room.startedPayload ? (
                      <button type="button" onClick={enterStartedOnlineGame} className="h-11 rounded-lg bg-[#00e676] text-sm font-black text-black hover:bg-[#1fe682]">
                        Enter game
                      </button>
                    ) : isOnlineHost ? (
                      <button type="button" onClick={() => setStep('setup')} className="h-11 rounded-lg bg-[#00e676] text-sm font-black text-black hover:bg-[#1fe682]">
                        Choose pack
                      </button>
                    ) : (
                      <div className="flex h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-xs font-black text-white/45">
                        Waiting for host
                      </div>
                    )}
                  </div>
                  {isRoomInfoOpen && (
                    <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="grid gap-2 text-xs text-white/55 sm:grid-cols-3">
                        <div><span className="block text-[10px] font-black uppercase tracking-wide text-white/35">Room</span><span className="font-mono text-white">{room.code}</span></div>
                        <div><span className="block text-[10px] font-black uppercase tracking-wide text-white/35">Challenge</span><span className="text-white">{room.settings?.challengeTitle || selectedChallenge?.title || 'Selected pack'}</span></div>
                        <div><span className="block text-[10px] font-black uppercase tracking-wide text-white/35">Songs each</span><span className="text-white">{room.settings?.turnsPerPlayer || safeTurns}</span></div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {[...players].sort((left, right) => right.score - left.score || left.name.localeCompare(right.name)).map((player, index) => (
                          <div key={player.id} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                            <span className="text-xs font-black text-white">{index + 1}. {player.name}{player.connected === false ? ' (left)' : ''}</span>
                            <span className="font-mono text-xs font-black text-[#00e676]">{player.score} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
