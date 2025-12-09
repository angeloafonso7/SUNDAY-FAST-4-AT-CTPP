
import React, { useState, useCallback, useEffect } from 'react';
import { Player, Match, TournamentState, Phase, Group, TournamentRecord, Category } from './types';
import { Setup } from './components/Setup';
import { TournamentFlow } from './components/TournamentFlow';
import { HistoryView } from './components/HistoryView';
import { Trophy, Activity, Calendar, Clock, History, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<TournamentState>({
    players: [],
    currentRound: 0,
    matches: [],
    isStarted: false,
    phase: 'GROUPS',
    groups: [],
    date: new Date().toISOString().split('T')[0],
  });

  const [history, setHistory] = useState<TournamentRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ace_manager_history_v2');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (record: TournamentRecord) => {
    const newHistory = [record, ...history];
    setHistory(newHistory);
    localStorage.setItem('ace_manager_history_v2', JSON.stringify(newHistory));
    setState(prev => ({ ...prev, isStarted: false }));
  };

  const handleStartTournament = (playerNames: string[], selectedDate: string) => {
    const players: Player[] = playerNames.map((name, index) => ({
      id: `p-${index}`,
      name,
      points: 0,
      gamesWon: 0,
      gamesLost: 0,
      matchesPlayed: 0,
    }));

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const groups: Group[] = [
      { id: 'A', name: 'Grupo A', playerIds: shuffled.slice(0, 3).map(p => p.id) },
      { id: 'B', name: 'Grupo B', playerIds: shuffled.slice(3, 6).map(p => p.id) },
      { id: 'C', name: 'Grupo C', playerIds: shuffled.slice(6, 9).map(p => p.id) },
      { id: 'D', name: 'Grupo D', playerIds: shuffled.slice(9, 12).map(p => p.id) },
    ];

    const playersWithGroups = players.map(p => ({
      ...p,
      groupId: groups.find(g => g.playerIds.includes(p.id))?.id
    }));

    const round1Matches: Match[] = groups.map((g, idx) => ({
      id: `m-r1-${g.id}`,
      player1Id: g.playerIds[0],
      player2Id: g.playerIds[1],
      score1: 0,
      score2: 0,
      courtId: idx + 1,
      round: 1,
      completed: false,
      phase: 'GROUPS',
      label: `Grupo ${g.id}`,
    }));

    setState({
      players: playersWithGroups,
      currentRound: 1,
      matches: round1Matches,
      isStarted: true,
      phase: 'GROUPS',
      groups,
      date: selectedDate,
    });
  };

  const calculateStats = (players: Player[], matches: Match[], groups: Group[]) => {
    const playersWithStats = players.map(p => {
      const pMatches = matches.filter(m => m.completed && (m.player1Id === p.id || m.player2Id === p.id));
      let wins = 0;
      let gWon = 0;
      let gLost = 0;
      pMatches.forEach(m => {
        const isP1 = m.player1Id === p.id;
        const score = isP1 ? m.score1 : m.score2;
        const oppScore = isP1 ? m.score2 : m.score1;
        if (score > oppScore) wins++;
        gWon += score;
        gLost += oppScore;
      });
      return { ...p, points: wins, gamesWon: gWon, gamesLost: gLost, matchesPlayed: pMatches.length };
    });

    // Update group ranks if in GROUPS phase or transition
    const playersWithRank = playersWithStats.map(p => {
      if (!p.groupId) return p;
      const gPlayers = playersWithStats.filter(p2 => p2.groupId === p.groupId);
      const sorted = [...gPlayers].sort((a, b) => b.points - a.points || (b.gamesWon - b.gamesLost) - (a.gamesWon - a.gamesLost));
      const rank = sorted.findIndex(p2 => p2.id === p.id) + 1;
      const category: Category = rank <= 2 ? 'TOP_8' : 'BOTTOM_4';
      return { ...p, groupRank: rank, category };
    });

    return playersWithRank;
  };

  const updateMatchResult = useCallback((matchId: string, s1: number, s2: number) => {
    setState(prev => {
      const updatedMatches = prev.matches.map(m => 
        m.id === matchId ? { ...m, score1: s1, score2: s2, completed: true } : m
      );
      const updatedPlayers = calculateStats(prev.players, updatedMatches, prev.groups);
      return { ...prev, players: updatedPlayers, matches: updatedMatches };
    });
  }, []);

  const unlockMatch = useCallback((matchId: string) => {
    setState(prev => {
      const updatedMatches = prev.matches.map(m => 
        m.id === matchId ? { ...m, completed: false } : m
      );
      const updatedPlayers = calculateStats(prev.players, updatedMatches, prev.groups);
      return { ...prev, players: updatedPlayers, matches: updatedMatches };
    });
  }, []);

  const undoRound = () => {
    setState(prev => {
      if (prev.currentRound <= 1) return prev;
      const newMatches = prev.matches.filter(m => m.round < prev.currentRound);
      let newPhase: Phase = 'GROUPS';
      if (prev.currentRound > 3) newPhase = 'PLAYOFFS';
      
      const revertedPlayers = calculateStats(prev.players, newMatches, prev.groups);

      return {
        ...prev,
        currentRound: prev.currentRound - 1,
        matches: newMatches,
        players: revertedPlayers,
        phase: newPhase
      };
    });
  };

  const advance = (newMatches: Match[], nextPhase?: Phase) => {
    setState(prev => ({
      ...prev,
      currentRound: prev.currentRound + 1,
      matches: [...prev.matches, ...newMatches],
      phase: nextPhase || prev.phase
    }));
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans text-slate-900">
      <header className="bg-slate-900 text-white p-6 shadow-2xl border-b-[6px] border-lime-400 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-lime-400 p-2.5 rounded-2xl">
               <Trophy className="w-7 h-7 text-slate-900" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
                SUNDAY FAST-4 <span className="text-lime-400">at CTPP</span>
              </h1>
              <p className="text-[9px] font-bold text-slate-400 tracking-[0.3em] uppercase mt-1">Torneio Mensal • {state.date}</p>
            </div>
          </div>
          <button 
              onClick={() => setShowHistory(!showHistory)}
              className="md:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700"
            >
              <History className="w-4 h-4 text-lime-400" />
              {showHistory ? 'Voltar' : 'Histórico'}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        {showHistory ? (
          <HistoryView history={history} onClose={() => setShowHistory(false)} />
        ) : !state.isStarted ? (
          <Setup onStart={handleStartTournament} />
        ) : (
          <TournamentFlow 
            state={state} 
            updateMatchResult={updateMatchResult} 
            unlockMatch={unlockMatch}
            onAdvance={advance} 
            onUndo={undoRound}
            onFinalize={(record) => saveToHistory(record)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
