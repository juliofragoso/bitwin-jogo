import mqtt from 'mqtt';
import { SocketMessage, StartGamePayload, PlayerFinishedPayload, JoinPayload } from '../types';

class MqttSocketService {
  private client: mqtt.MqttClient | null = null;
  private listeners: ((message: SocketMessage) => void)[] = [];
  
  // Unique ID for this session to ignore our own messages
  private myId: string = Math.random().toString(36).substring(2, 15);
  
  // Public EMQX Broker (Secure WebSocket)
  private readonly BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
  
  private readonly TOPIC_PREFIX = 'bitwin-game-v1/';

  constructor() {
    console.log('Socket Service Initialized with ID:', this.myId);
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

  public generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getTopic(roomId: string) {
    return `${this.TOPIC_PREFIX}${roomId}`;
  }

  // Connect to the MQTT broker
  private async connect(): Promise<void> {
    if (this.client?.connected) return;

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(this.BROKER_URL, {
        clientId: `bitwin-${this.myId}`,
        keepalive: 60,
        protocolId: 'MQTT',
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
      });

      this.client.on('connect', () => {
        console.log('Connected to MQTT Broker');
        resolve();
      });

      // Fixed: renamed topic to _topic to avoid "unused variable" error
      this.client.on('message', (_topic, message) => {
        try {
          const parsedMsg: SocketMessage = JSON.parse(message.toString());
          // Filter out messages sent by ourselves
          if (parsedMsg.senderId !== this.myId) {
             console.log('Received:', parsedMsg.type, 'from', parsedMsg.senderId);
             this.notifyListeners(parsedMsg);
          }
        } catch (e) {
          console.error('Failed to parse message', e);
        }
      });

      this.client.on('error', (err) => {
        console.error('MQTT Error:', err);
        if (!this.client?.connected) reject(err);
      });
    });
  }

  // --- Actions ---

  public async host(roomId: string, hostName: string): Promise<void> {
    await this.connect();
    
    const topic = this.getTopic(roomId);
    this.client?.subscribe(topic, (err) => {
        if (err) console.error('Subscribe error:', err);
        else console.log(`Hosted/Subscribed to ${topic} as ${hostName}`);
    });
  }

  public async joinRoom(roomId: string, playerName: string): Promise<void> {
    await this.connect();
    
    const topic = this.getTopic(roomId);
    
    return new Promise((resolve, reject) => {
        this.client?.subscribe(topic, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log(`Joined/Subscribed to ${topic} as ${playerName}`);
            
            // Broadcast JOIN message to the topic
            this.sendMessage(roomId, {
                type: 'JOIN',
                payload: { roomId, playerName } as JoinPayload
            });
            resolve();
        });
    });
  }

  private sendMessage(roomId: string, msg: SocketMessage) {
    if (this.client?.connected) {
        const topic = this.getTopic(roomId);
        const msgWithId = { ...msg, senderId: this.myId };
        this.client.publish(topic, JSON.stringify(msgWithId));
    } else {
        console.warn('Cannot send, not connected');
    }
  }

  public startGame(roomId: string, config: StartGamePayload) {
    this.sendMessage(roomId, {
      type: 'START_GAME',
      payload: { ...config, roomId } 
    });
  }

  public sendFinished(roomId: string, attempts: number) {
    this.sendMessage(roomId, {
      type: 'PLAYER_FINISHED',
      payload: { roomId, attempts } as PlayerFinishedPayload
    });
  }

  public restartGame(roomId: string) {
      this.sendMessage(roomId, {
          type: 'RESTART',
          payload: { roomId }
      });
  }

  public disconnect() {
      if (this.client) {
          this.client.end();
          this.client = null;
      }
  }
}

export const socketService = new MqttSocketService();