
export type Phase = 'GROUPS' | 'PLAYOFFS' | 'FINISHED';
export type Category = 'TOP_8' | 'BOTTOM_4';

export interface Player {
  id: string;
  name: string;
  points: number; 
  gamesWon: number;
  gamesLost: number;
  matchesPlayed: number;
  groupId?: string;
  groupRank?: number;
  category?: Category;
  finalPosition?: number;
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  score1: number;
  score2: number;
  courtId: number;
  round: number;
  completed: boolean;
  phase: Phase;
  label: string; 
}

export interface Group {
  id: string;
  name: string;
  playerIds: string[];
}

export interface TournamentRecord {
  id: string;
  date: string;
  players: Player[];
  matches: Match[];
  groups: Group[];
}

export interface TournamentState {
  players: Player[];
  currentRound: number;
  matches: Match[];
  isStarted: boolean;
  phase: Phase;
  groups: Group[];
  date: string;
}
