/** Client-side network manager using socket.io-client */

import { io, type Socket } from 'socket.io-client';
import { TypedEventEmitter, type EventMap } from './events';

export interface NetworkEvents extends EventMap {
  connected:    () => void;
  disconnected: (reason: string) => void;
  error:        (err: Error) => void;
  roomJoined:   (roomId: string) => void;
  roomLeft:     (roomId: string) => void;
  peerJoined:   (peerId: string) => void;
  peerLeft:     (peerId: string) => void;
  message:      (type: string, data: unknown, senderId: string) => void;
  stateUpdate:  (state: unknown) => void;
  ping:         (latencyMs: number) => void;
}

export interface NetworkClientConfig {
  /** Server URL (e.g. 'http://localhost:3001') */
  url: string;
  /** Auto-reconnect on disconnect. Default true. */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts. Default 5. */
  reconnectAttempts?: number;
  /** Delay between reconnection attempts in ms. Default 1000. */
  reconnectDelay?: number;
}

export class NetworkClient extends TypedEventEmitter<NetworkEvents> {
  private socket: Socket | null = null;
  private _connected = false;
  private _roomId: string | null = null;
  private _peerId: string | null = null;
  private _latency = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  get connected(): boolean { return this._connected; }
  get roomId(): string | null { return this._roomId; }
  get peerId(): string | null { return this._peerId; }
  get latency(): number { return this._latency; }

  /** Connect to a server. */
  connect(config: NetworkClientConfig): void {
    if (this.socket) this.disconnect();

    const autoReconnect = config.autoReconnect ?? true;

    this.socket = io(config.url, {
      reconnection: autoReconnect,
      reconnectionAttempts: config.reconnectAttempts ?? 5,
      reconnectionDelay: config.reconnectDelay ?? 1000,
    });

    this.socket.on('connect', () => {
      this._connected = true;
      this._peerId = this.socket!.id ?? null;
      this.emit('connected');
      this.startPing();
    });

    this.socket.on('disconnect', (reason: string) => {
      this._connected = false;
      this._roomId = null;
      this.stopPing();
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (err: Error) => {
      this.emit('error', err);
    });

    this.socket.on('room_joined', (roomId: string) => {
      this._roomId = roomId;
      this.emit('roomJoined', roomId);
    });

    this.socket.on('room_left', (roomId: string) => {
      this._roomId = null;
      this.emit('roomLeft', roomId);
    });

    this.socket.on('peer_joined', (peerId: string) => {
      this.emit('peerJoined', peerId);
    });

    this.socket.on('peer_left', (peerId: string) => {
      this.emit('peerLeft', peerId);
    });

    this.socket.on('message', (payload: { type: string; data: unknown; senderId: string }) => {
      this.emit('message', payload.type, payload.data, payload.senderId);
    });

    this.socket.on('state_update', (state: unknown) => {
      this.emit('stateUpdate', state);
    });

    this.socket.on('ping_res', (timestamp: number) => {
      this._latency = Date.now() - timestamp;
      this.emit('ping', this._latency);
    });
  }

  /** Disconnect from the server. */
  disconnect(): void {
    this.stopPing();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this._connected = false;
    this._roomId = null;
    this._peerId = null;
  }

  /** Join a room on the server. */
  joinRoom(roomId: string): void {
    this.socket?.emit('join_room', roomId);
  }

  /** Leave the current room. */
  leaveRoom(): void {
    if (this._roomId) {
      this.socket?.emit('leave_room', this._roomId);
    }
  }

  /** Send a typed message to the server. */
  send(type: string, data: unknown): void {
    this.socket?.emit('message', { type, data });
  }

  /** Broadcast a message to all other peers in the room. */
  broadcast(type: string, data: unknown): void {
    this.socket?.emit('broadcast', { type, data });
  }

  /** Send a message to a specific peer. */
  sendTo(peerId: string, type: string, data: unknown): void {
    this.socket?.emit('send_to', { peerId, type, data });
  }

  /** Clean up all resources. */
  dispose(): void {
    this.disconnect();
    this.removeAllListeners();
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.socket?.emit('ping_req', Date.now());
    }, 2000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
