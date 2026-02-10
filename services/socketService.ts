import { Peer, DataConnection } from 'peerjs';
import { SocketMessage, StartGamePayload, PlayerFinishedPayload, JoinPayload } from '../types';

class P2PSocketService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private listeners: ((message: SocketMessage) => void)[] = [];
  
  // Used to namespace the IDs so they don't clash with other PeerJS users easily
  private readonly ID_PREFIX = 'bitwin-game-v1-';

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

  // Host initializes the room (Opens P2P Server)
  public async host(roomId: string, hostName: string): Promise<void> {
    this.disconnect(); // Clear any previous session

    const peerId = `${this.ID_PREFIX}${roomId}`;
    
    // Log hostName to avoid unused variable error and for debugging purposes
    console.log(`Initializing host session for player: ${hostName} in room: ${roomId}`);

    return new Promise((resolve, reject) => {
        this.peer = new Peer(peerId);

        this.peer.on('open', (id) => {
            console.log('Host initialized:', id);
            resolve();
        });

        this.peer.on('connection', (conn) => {
            console.log('Host received connection');
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            // Reject the promise if initialization fails
            reject(err);
        });
    });
  }

  // Joiner connects to the room
  public async joinRoom(roomId: string, playerName: string): Promise<void> {
    this.disconnect();

    // Joiner gets a random ID
    this.peer = new Peer();

    return new Promise((resolve, reject) => {
        this.peer!.on('open', () => {
            const hostId = `${this.ID_PREFIX}${roomId}`;
            console.log('Connecting to:', hostId);
            
            const conn = this.peer!.connect(hostId, {
                metadata: { playerName }
            });

            conn.on('open', () => {
                console.log('Connected to Host');
                this.handleConnection(conn);
                
                // Send JOIN message immediately
                this.sendMessage({
                    type: 'JOIN',
                    payload: { roomId, playerName } as JoinPayload
                });
                resolve();
            });

            conn.on('error', (err) => {
                console.error('Connection error:', err);
                reject(err);
            });
        });
        
        this.peer!.on('error', (err) => {
             console.error('Peer error (Joiner):', err);
        });
    });
  }

  private handleConnection(conn: DataConnection) {
    this.conn = conn;

    conn.on('data', (data) => {
        // console.log('Received Data:', data);
        this.notifyListeners(data as SocketMessage);
    });

    conn.on('close', () => {
        console.log('Connection closed');
        this.conn = null;
    });

    conn.on('error', (err) => {
        console.error('Conn Error:', err);
    });
  }

  private sendMessage(msg: SocketMessage) {
    if (this.conn && this.conn.open) {
        this.conn.send(msg);
    } else {
        console.warn('Cannot send message, no connection:', msg);
    }
  }

  public startGame(roomId: string, config: StartGamePayload) {
    this.sendMessage({
      type: 'START_GAME',
      payload: { ...config, roomId } 
    });
  }

  public sendFinished(roomId: string, attempts: number) {
    // Notify local listeners (so I can see my own finish state logic if needed, 
    // though App.tsx usually handles local state directly, it's good for symmetry)
    // Actually App.tsx calls sendFinished AND sets local state. 
    // But we need to send to opponent.
    this.sendMessage({
      type: 'PLAYER_FINISHED',
      payload: { roomId, attempts } as PlayerFinishedPayload
    });
  }

  public restartGame(roomId: string) {
      this.sendMessage({
          type: 'RESTART',
          payload: { roomId }
      });
  }

  public disconnect() {
      if (this.conn) {
          this.conn.close();
          this.conn = null;
      }
      if (this.peer) {
          this.peer.destroy();
          this.peer = null;
      }
  }
}

export const socketService = new P2PSocketService();