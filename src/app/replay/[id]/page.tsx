'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Move {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: 'white' | 'black';
  timestamp: number;
}

interface GameSession {
  id: string;
  started_at: string;
  completed_at: string | null;
  is_won: boolean;
  total_moves: number;
  duration_seconds: number | null;
  moves: Move[];
}

type Piece = 'white' | 'black' | null;
type Board = Piece[][];

const initialBoard: Board = [
  ['black', null, 'black'],
  [null, null, null],
  ['white', null, 'white'],
];

export default function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [board, setBoard] = useState<Board>(initialBoard.map(row => [...row]));
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        if (!res.ok) throw new Error('Session not found');
        const data = await res.json();
        // Parse moves if it's a string
        if (typeof data.moves === 'string') {
          data.moves = JSON.parse(data.moves);
        }
        setSession(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [id]);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || !session) return;

    if (currentMoveIndex >= session.moves.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      goToMove(currentMoveIndex + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [isPlaying, currentMoveIndex, session]);

  const calculateBoardAtMove = (moveIndex: number): Board => {
    const newBoard: Board = initialBoard.map(row => [...row]);

    if (!session) return newBoard;

    for (let i = 0; i <= moveIndex; i++) {
      const move = session.moves[i];
      newBoard[move.to.row][move.to.col] = newBoard[move.from.row][move.from.col];
      newBoard[move.from.row][move.from.col] = null;
    }

    return newBoard;
  };

  const goToMove = (index: number) => {
    if (!session) return;
    const clampedIndex = Math.max(-1, Math.min(index, session.moves.length - 1));
    setCurrentMoveIndex(clampedIndex);
    setBoard(calculateBoardAtMove(clampedIndex));
  };

  const getCellClass = (row: number, col: number): string => {
    const isLight = (row + col) % 2 === 0;
    const currentMove = session?.moves[currentMoveIndex];
    const isFrom = currentMove && currentMove.from.row === row && currentMove.from.col === col;
    const isTo = currentMove && currentMove.to.row === row && currentMove.to.col === col;

    let className = `w-20 h-20 flex items-center justify-center text-5xl transition-all select-none `;
    className += isLight ? 'bg-[#eeeed2] ' : 'bg-[#769656] ';
    if (isFrom) className += 'ring-4 ring-inset ring-red-400 ';
    if (isTo) className += 'ring-4 ring-inset ring-green-400 ';

    return className;
  };

  const renderPiece = (piece: Piece) => {
    if (!piece) return null;

    const pieceClass = piece === 'white'
      ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] [text-shadow:1px_1px_0_#000,-1px_1px_0_#000,1px_-1px_0_#000,-1px_-1px_0_#000]'
      : 'text-gray-900 drop-shadow-[0_2px_2px_rgba(100,100,100,0.5)]';

    return <span className={pieceClass}>&#9822;</span>;
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="text-xl text-red-400 mb-4">Erreur: {error || 'Session non trouvée'}</div>
        <Link href="/history" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold">
          Retour à l&apos;historique
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <h1 className="text-2xl font-bold mb-2">Replay de partie</h1>
      <p className="text-gray-400 mb-4">
        {session.is_won ? (
          <span className="text-green-400">Partie gagnée</span>
        ) : (
          <span className="text-red-400">Partie abandonnée</span>
        )}
        {' '}- {session.total_moves} coups
      </p>

      <div className="grid grid-cols-3 gap-0.5 bg-gray-700 p-2 rounded-lg shadow-2xl mb-6">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClass(rowIndex, colIndex)}
            >
              {renderPiece(cell)}
            </div>
          ))
        )}
      </div>

      {/* Move info */}
      <div className="text-lg mb-4">
        Coup {currentMoveIndex + 1} / {session.moves.length}
        {currentMoveIndex >= 0 && session.moves[currentMoveIndex] && (
          <span className="text-gray-400 ml-2">
            ({formatTime(session.moves[currentMoveIndex].timestamp)})
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => goToMove(-1)}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-bold disabled:opacity-50"
          disabled={currentMoveIndex === -1}
        >
          ⏮ Début
        </button>
        <button
          onClick={() => goToMove(currentMoveIndex - 1)}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-bold disabled:opacity-50"
          disabled={currentMoveIndex === -1}
        >
          ◀ Précédent
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 rounded-lg font-bold ${isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <button
          onClick={() => goToMove(currentMoveIndex + 1)}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-bold disabled:opacity-50"
          disabled={currentMoveIndex >= session.moves.length - 1}
        >
          Suivant ▶
        </button>
        <button
          onClick={() => goToMove(session.moves.length - 1)}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-bold disabled:opacity-50"
          disabled={currentMoveIndex >= session.moves.length - 1}
        >
          Fin ⏭
        </button>
      </div>

      {/* Move list */}
      <div className="bg-slate-700/30 rounded-lg p-4 max-h-40 overflow-y-auto w-full max-w-md">
        <div className="grid grid-cols-4 gap-2 text-sm">
          {session.moves.map((move, index) => (
            <button
              key={index}
              onClick={() => goToMove(index)}
              className={`px-2 py-1 rounded ${
                index === currentMoveIndex
                  ? 'bg-cyan-600'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
            >
              {index + 1}. {move.piece === 'white' ? 'B' : 'N'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <Link
          href="/history"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
        >
          Historique
        </Link>
        <Link
          href="/"
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold"
        >
          Nouvelle partie
        </Link>
      </div>
    </div>
  );
}
