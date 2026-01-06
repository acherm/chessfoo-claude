'use client';

import { useState, useEffect, useCallback } from 'react';

interface Position {
  row: number;
  col: number;
}

interface Move {
  from: Position;
  to: Position;
  piece: 'white' | 'black';
  timestamp: number;
}

type Piece = 'white' | 'black' | null;
type Board = Piece[][];

const initialBoard: Board = [
  ['black', null, 'black'],
  [null, null, null],
  ['white', null, 'white'],
];

const winBoard: Board = [
  ['white', null, 'white'],
  [null, null, null],
  ['black', null, 'black'],
];

export default function ChessGame() {
  const [board, setBoard] = useState<Board>(initialBoard.map(row => [...row]));
  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Timer effect
  useEffect(() => {
    if (startTime && !isWon) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, isWon]);

  // Create session on first move
  const ensureSession = useCallback(async () => {
    if (!sessionId) {
      try {
        const response = await fetch('/api/sessions', { method: 'POST' });
        const data = await response.json();
        setSessionId(data.sessionId);
        setStartTime(Date.now());
        return data.sessionId;
      } catch (error) {
        console.error('Failed to create session:', error);
        return null;
      }
    }
    return sessionId;
  }, [sessionId]);

  const getValidKnightMoves = (row: number, col: number): Position[] => {
    const knightOffsets = [
      [-2, -1], [-2, 1],
      [-1, -2], [-1, 2],
      [1, -2], [1, 2],
      [2, -1], [2, 1],
    ];

    const validMoves: Position[] = [];
    for (const [dr, dc] of knightOffsets) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < 3 && newCol >= 0 && newCol < 3) {
        if (board[newRow][newCol] === null) {
          validMoves.push({ row: newRow, col: newCol });
        }
      }
    }
    return validMoves;
  };

  const checkWin = (newBoard: Board): boolean => {
    return (
      newBoard[0][0] === 'white' &&
      newBoard[0][2] === 'white' &&
      newBoard[2][0] === 'black' &&
      newBoard[2][2] === 'black'
    );
  };

  const handleCellClick = async (row: number, col: number) => {
    if (isWon || isLoading) return;

    const piece = board[row][col];

    if (selectedCell) {
      const validMoves = getValidKnightMoves(selectedCell.row, selectedCell.col);
      const isValidMove = validMoves.some(m => m.row === row && m.col === col);

      if (isValidMove) {
        setIsLoading(true);

        // Ensure we have a session
        const currentSessionId = await ensureSession();

        // Make the move
        const newBoard = board.map(r => [...r]);
        const movedPiece = newBoard[selectedCell.row][selectedCell.col]!;
        newBoard[row][col] = movedPiece;
        newBoard[selectedCell.row][selectedCell.col] = null;

        const move: Move = {
          from: selectedCell,
          to: { row, col },
          piece: movedPiece,
          timestamp: startTime ? Date.now() - startTime : 0,
        };

        setBoard(newBoard);
        setMoves([...moves, move]);
        setMoveCount(moveCount + 1);
        setSelectedCell(null);

        // Save move to database
        if (currentSessionId) {
          try {
            await fetch(`/api/sessions/${currentSessionId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ move }),
            });
          } catch (error) {
            console.error('Failed to save move:', error);
          }
        }

        // Check for win
        if (checkWin(newBoard)) {
          setIsWon(true);
          const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

          if (currentSessionId) {
            try {
              await fetch(`/api/sessions/${currentSessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  complete: true,
                  isWon: true,
                  durationSeconds: duration,
                }),
              });
            } catch (error) {
              console.error('Failed to complete session:', error);
            }
          }
        }

        setIsLoading(false);
      } else if (piece !== null) {
        setSelectedCell({ row, col });
      } else {
        setSelectedCell(null);
      }
    } else if (piece !== null) {
      setSelectedCell({ row, col });
    }
  };

  const resetGame = async () => {
    // Complete current session if exists and not won
    if (sessionId && !isWon && startTime) {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            complete: true,
            isWon: false,
            durationSeconds: Math.floor((Date.now() - startTime) / 1000),
          }),
        });
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
    }

    setBoard(initialBoard.map(row => [...row]));
    setSelectedCell(null);
    setMoves([]);
    setMoveCount(0);
    setStartTime(null);
    setElapsedTime(0);
    setSessionId(null);
    setIsWon(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCellClass = (row: number, col: number): string => {
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const validMoves = selectedCell ? getValidKnightMoves(selectedCell.row, selectedCell.col) : [];
    const isValidMove = validMoves.some(m => m.row === row && m.col === col);

    let className = `w-24 h-24 flex items-center justify-center text-6xl cursor-pointer transition-all select-none relative `;
    className += isLight ? 'bg-[#eeeed2] ' : 'bg-[#769656] ';
    if (isSelected) className += 'ring-4 ring-inset ring-yellow-400 ';
    if (isValidMove) className += 'after:absolute after:w-8 after:h-8 after:bg-black/20 after:rounded-full ';

    return className;
  };

  const renderPiece = (piece: Piece) => {
    if (!piece) return null;

    const pieceClass = piece === 'white'
      ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] [text-shadow:1px_1px_0_#000,-1px_1px_0_#000,1px_-1px_0_#000,-1px_-1px_0_#000]'
      : 'text-gray-900 drop-shadow-[0_2px_2px_rgba(100,100,100,0.5)]';

    return <span className={pieceClass}>&#9822;</span>;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <h1 className="text-3xl font-bold mb-2">Puzzle des Cavaliers</h1>
      <p className="text-gray-400 mb-6 text-center max-w-md">
        Échangez les positions des cavaliers blancs et noirs en utilisant le déplacement en &quot;L&quot;.
      </p>

      <div className="grid grid-cols-3 gap-0.5 bg-gray-700 p-2 rounded-lg shadow-2xl">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClass(rowIndex, colIndex)}
              onClick={() => handleCellClick(rowIndex, colIndex)}
            >
              {renderPiece(cell)}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-8 mt-6 text-lg">
        <div className="text-center">
          <div className="text-gray-400">Coups</div>
          <div className="text-2xl font-bold text-cyan-400">{moveCount}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Temps</div>
          <div className="text-2xl font-bold text-cyan-400">{formatTime(elapsedTime)}</div>
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          onClick={resetGame}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-all hover:-translate-y-0.5"
        >
          Recommencer
        </button>
        <a
          href="/history"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-all hover:-translate-y-0.5"
        >
          Historique
        </a>
      </div>

      {isWon && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <h2 className="text-5xl font-bold text-green-500 mb-4">Bravo !</h2>
          <p className="text-xl mb-2">
            Puzzle résolu en <span className="font-bold text-cyan-400">{moveCount}</span> coups
          </p>
          <p className="text-xl mb-6">
            Temps : <span className="font-bold text-cyan-400">{formatTime(elapsedTime)}</span>
          </p>
          <button
            onClick={resetGame}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-xl transition-all hover:-translate-y-0.5"
          >
            Rejouer
          </button>
        </div>
      )}
    </div>
  );
}
