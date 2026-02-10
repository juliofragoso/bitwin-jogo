export enum GameState {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  WAITING_RESULT = 'WAITING_RESULT', // Player finished, waiting for opponent
  GAME_OVER = 'GAME_OVER',
}

export type GameMode = 'CLASSIC' | 'HACKER';

export enum PowerUpType {
  BINARY_SCAN = 'BINARY_SCAN',
  GLITCH_BOMB = 'GLITCH_BOMB',
  DOUBLE_THREAD = 'DOUBLE_THREAD',
  FREEZE_FRAME = 'FREEZE_FRAME',
}

export enum PassiveType {
  FIREWALL = 'FIREWALL',
  THERMAL_SENSOR = 'THERMAL_SENSOR',
  OVERCLOCK = 'OVERCLOCK',
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
  gameMode: GameMode;
}

export interface GuessResult {
  value: number;
  direction: 'HIGHER' | 'LOWER' | 'CORRECT';
  freeAttempt?: boolean; // For Overclock
}

export interface SocketMessage {
  senderId?: string; // ID to filter own messages
  type: 'JOIN' | 'START_GAME' | 'PLAYER_FINISHED' | 'RESTART' | 'REMATCH_REQUEST' | 'REMATCH_ACCEPTED' | 'REMATCH_DECLINED' | 'POWER_UP_EFFECT';
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
  gameMode: GameMode;
}

export interface PlayerFinishedPayload {
  roomId: string;
  attempts: number;
}

export interface RematchPayload {
  roomId: string;
  requesterName: string;
}

export interface PowerUpPayload {
  roomId: string;
  effect: 'GLITCH' | 'FREEZE';
  duration?: number;
}