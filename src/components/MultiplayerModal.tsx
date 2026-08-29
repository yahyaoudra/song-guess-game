import React, { useMemo, useState } from 'react';
import { Copy, Gamepad2, Plus, X } from 'lucide-react';

interface MultiplayerModalProps {
  onClose: () => void;
}

interface LocalPlayer {
  id: string;
  name: string;
  score: number;
}

function createRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'party' | 'room'>('party');
  const [roomCode, setRoomCode] = useState(createRoomCode);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState<LocalPlayer[]>([
    { id: 'p1', name: 'Player 1', score: 0 },
    { id: 'p2', name: 'Player 2', score: 0 }
  ]);

  const sortedPlayers = useMemo(
    () => [...players].sort((left, right) => right.score - left.score),
    [players]
  );

  const addPlayer = () => {
    const cleanName = playerName.trim() || `Player ${players.length + 1}`;
    setPlayers((current) => [...current, { id: `p-${Date.now()}`, name: cleanName, score: 0 }]);
    setPlayerName('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-lg border border-white/12 bg-[#0d1410] p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00e676]/15 text-[#00e676]">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-white">Multiplayer</h2>
              <p className="mt-1 text-xs text-white/50">Use a local party scoreboard now, or create a room code for real-time play.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close multiplayer modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 rounded-lg border border-white/10 bg-white/5 p-1">
          {(['party', 'room'] as const).map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={`h-9 rounded-md text-xs font-black capitalize ${
                mode === item ? 'bg-[#00e676] text-black' : 'text-white/55 hover:text-white'
              }`}
            >
              {item === 'party' ? 'Same device' : 'Room code'}
            </button>
          ))}
        </div>

        {mode === 'party' ? (
          <div className="mt-4">
            <div className="flex gap-2">
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Add player name"
                className="h-10 flex-1 rounded-lg border border-white/10 bg-[#141c17] px-3 text-sm text-white outline-none focus:border-[#00e676]"
              />
              <button
                onClick={addPlayer}
                className="flex h-10 items-center gap-2 rounded-lg bg-[#00e676] px-4 text-xs font-black text-black hover:bg-[#1fe682]"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#121915] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{index + 1}. {player.name}</p>
                    <p className="text-[10px] text-white/40">Same-device party score</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPlayers((current) => current.map((item) => item.id === player.id ? { ...item, score: Math.max(0, item.score - 100) } : item))}
                      className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    >
                      -
                    </button>
                    <span className="w-14 text-center font-mono text-sm font-black text-[#00e676]">{player.score}</span>
                    <button
                      onClick={() => setPlayers((current) => current.map((item) => item.id === player.id ? { ...item, score: item.score + 100 } : item))}
                      className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-[#121915] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-white/45">Create room</p>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
                <span className="font-mono text-lg font-black text-[#00e676]">{roomCode}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(roomCode)}
                  className="flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white/70 hover:bg-white/10"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
              <button
                onClick={() => setRoomCode(createRoomCode())}
                className="mt-3 h-9 w-full rounded-lg bg-[#00e676] text-xs font-black text-black hover:bg-[#1fe682]"
              >
                New code
              </button>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#121915] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-white/45">Join room</p>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                maxLength={8}
                placeholder="ROOM CODE"
                className="mt-3 h-10 w-full rounded-lg border border-white/10 bg-[#141c17] px-3 font-mono text-sm text-white outline-none focus:border-[#00e676]"
              />
              <button className="mt-3 h-9 w-full rounded-lg border border-[#00e676]/40 bg-[#00e676]/10 text-xs font-black text-[#00e676] hover:bg-[#00e676]/15">
                Join real-time room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
