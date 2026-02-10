import { SocketMessage, StartGamePayload, PlayerFinishedPayload, JoinPayload } from '../types';

class MockSocketService {
  private channel: BroadcastChannel;
  private listeners: ((message: SocketMessage) => void)[] = [];

  constructor() {
    this.channel = new BroadcastChannel('bitwin_channel');
    this.channel.onmessage = (event) => {
      this.notifyListeners(event.data as SocketMessage);
    };
  }

  public subscribe(callback: (message: SocketMessage) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(message: SocketMessage) {
    this.listeners.forEach(listener => listener(message));
  }

  // Generate a random 5-character code
  public generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // --- Actions ---

  public joinRoom(roomId: string, playerName: string) {
    this.channel.postMessage({
      type: 'JOIN',
      payload: { roomId, playerName } as JoinPayload
    });
  }

  public startGame(roomId: string, config: StartGamePayload) {
    this.channel.postMessage({
      type: 'START_GAME',
      payload: { ...config, roomId } 
    });
  }

  public sendFinished(roomId: string, attempts: number) {
    this.channel.postMessage({
      type: 'PLAYER_FINISHED',
      payload: { roomId, attempts } as PlayerFinishedPayload
    });
  }

  public restartGame(roomId: string) {
      this.channel.postMessage({
          type: 'RESTART',
          payload: { roomId }
      });
  }
}

export const socketService = new MockSocketService();