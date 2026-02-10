export enum GameState {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  WAITING_RESULT = 'WAITING_RESULT', // Player finished, waiting for opponent
  GAME_OVER = 'GAME_OVER',
}

export interface GameConfig {
  minRange: number;
  maxRange: number;
  targetNumber: number;
  roomId: string;
  hostName: string;
  joinerName: string;
  hostAvatar: string;
  joinerAvatar: string;
}

export interface GuessResult {
  value: number;
  direction: 'HIGHER' | 'LOWER' | 'CORRECT';
}

export interface SocketMessage {
  senderId?: string; // ID to filter own messages
  type: 'JOIN' | 'START_GAME' | 'PLAYER_FINISHED' | 'RESTART' | 'REMATCH_REQUEST' | 'REMATCH_ACCEPTED' | 'REMATCH_DECLINED';
  payload?: any;
}

// Payload types
export interface JoinPayload {
  roomId: string;
  playerName: string;
  playerAvatar: string;
}

export interface StartGamePayload {
  minRange: number;
  maxRange: number;
  targetNumber: number;
  hostName: string;
  joinerName: string;
  hostAvatar: string;
  joinerAvatar: string;
}

export interface PlayerFinishedPayload {
  roomId: string;
  attempts: number;
}

export interface RematchPayload {
  roomId: string;
  requesterName: string;
}