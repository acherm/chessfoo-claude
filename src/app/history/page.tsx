'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GameSession {
  id: string;
  started_at: string;
  completed_at: string | null;
  is_won: boolean;
  total_moves: number;
  duration_seconds: number | null;
  moves: Array<{
    from: { row: number; col: number };
    to: { row: number; col: number };
    piece: 'white' | 'black';
    timestamp: number;
  }>;
}

interface Stats {
  total_games: string;
  wins: string;
  avg_moves_to_win: string | null;
  avg_time_to_win: string | null;
  best_moves: string | null;
  best_time: string | null;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sessionsRes, statsRes] = await Promise.all([
          fetch('/api/sessions'),
          fetch('/api/sessions?type=stats'),
        ]);

        if (!sessionsRes.ok || !statsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const sessionsData = await sessionsRes.json();
        const statsData = await statsRes.json();

        setSessions(sessionsData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
        <div className="text-xl text-red-400 mb-4">Erreur: {error}</div>
        <p className="text-gray-400 mb-4">
          Assurez-vous que la base de données est initialisée.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
        >
          Retour au jeu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Historique des parties</h1>
          <Link
            href="/"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-all"
          >
            Nouvelle partie
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Parties jouées</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.total_games}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Victoires</div>
              <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Meilleur score</div>
              <div className="text-2xl font-bold text-yellow-400">
                {stats.best_moves ? `${stats.best_moves} coups` : '-'}
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Meilleur temps</div>
              <div className="text-2xl font-bold text-yellow-400">
                {formatTime(stats.best_time ? parseInt(stats.best_time) : null)}
              </div>
            </div>
          </div>
        )}

        {/* Sessions list */}
        <div className="bg-slate-700/30 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-center">Résultat</th>
                <th className="px-4 py-3 text-center">Coups</th>
                <th className="px-4 py-3 text-center">Temps</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Aucune partie enregistrée
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="border-t border-slate-600/50 hover:bg-slate-700/30">
                    <td className="px-4 py-3">{formatDate(session.started_at)}</td>
                    <td className="px-4 py-3 text-center">
                      {session.is_won ? (
                        <span className="text-green-400 font-bold">Gagné</span>
                      ) : session.completed_at ? (
                        <span className="text-red-400">Abandonné</span>
                      ) : (
                        <span className="text-yellow-400">En cours</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{session.total_moves}</td>
                    <td className="px-4 py-3 text-center">
                      {formatTime(session.duration_seconds)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/replay/${session.id}`}
                        className="text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Revoir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
