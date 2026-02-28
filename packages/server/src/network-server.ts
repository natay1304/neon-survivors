/** Server-side network manager using socket.io */

import { createServer, type Server as HttpServer } from 'http';
import { Server as SocketServer, type Socket } from 'socket.io';

export interface ServerConfig {
  /** Port to listen on. Default 3001. */
  port?: number;
  /** CORS configuration. */
  cors?: { origin: string | string[] };
  /** State broadcast tick rate in Hz. Default 20. Set to 0 to disable. */
  tickRate?: number;
}

export interface RoomInfo {
  id: string;
  clients: Map<string, Socket>;
  state: unknown;
}

export class NetworkServer {
  private io: SocketServer;
  private httpServer: HttpServer;
  private rooms = new Map<string, RoomInfo>();
  private tickRate: number;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private port: number;

  /** Called when a client connects. */
  onClientConnect: ((socket: Socket) => void) | null = null;
  /** Called when a client disconnects. */
  onClientDisconnect: ((socketId: string, roomId: string | null) => void) | null = null;
  /** Called when a message is received from a client. */
  onMessage: ((socketId: string, type: string, data: unknown) => void) | null = null;
  /** Called when a new room is created. */
  onRoomCreated: ((roomId: string) => void) | null = null;
  /** Called when a room becomes empty and is removed. */
  onRoomEmpty: ((roomId: string) => void) | null = null;

  constructor(config: ServerConfig = {}) {
    this.port = config.port ?? 3001;
    this.tickRate = config.tickRate ?? 20;

    this.httpServer = createServer();
    this.io = new SocketServer(this.httpServer, {
      cors: config.cors ?? { origin: '*' },
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  /** Start listening for connections. */
  start(): void {
    this.httpServer.listen(this.port);

    if (this.tickRate > 0) {
      this.tickInterval = setInterval(() => this.broadcastRoomStates(), 1000 / this.tickRate);
    }
  }

  /** Stop the server and clean up. */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.io.close();
    this.httpServer.close();
    this.rooms.clear();
  }

  /** Get a room by ID. */
  getRoom(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  /** Get all client socket IDs in a room. */
  getRoomClients(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? [...room.clients.keys()] : [];
  }

  /** Send a message to all clients in a room (optionally excluding one). */
  broadcastToRoom(roomId: string, type: string, data: unknown, excludeId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const [id, socket] of room.clients) {
      if (id !== excludeId) {
        socket.emit('message', { type, data, senderId: 'server' });
      }
    }
  }

  /** Set the shared state for a room (broadcast on tick). */
  setRoomState(roomId: string, state: unknown): void {
    const room = this.rooms.get(roomId);
    if (room) room.state = state;
  }

  private handleConnection(socket: Socket): void {
    this.onClientConnect?.(socket);

    let currentRoom: string | null = null;

    socket.on('join_room', (roomId: string) => {
      // Leave previous room if any
      if (currentRoom) this.removeFromRoom(socket, currentRoom);

      // Create room if it doesn't exist
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, { id: roomId, clients: new Map(), state: null });
        this.onRoomCreated?.(roomId);
      }

      const room = this.rooms.get(roomId)!;
      room.clients.set(socket.id, socket);
      currentRoom = roomId;

      socket.emit('room_joined', roomId);

      // Notify other peers
      for (const [id, peer] of room.clients) {
        if (id !== socket.id) {
          peer.emit('peer_joined', socket.id);
          socket.emit('peer_joined', id);
        }
      }
    });

    socket.on('leave_room', (roomId: string) => {
      this.removeFromRoom(socket, roomId);
      currentRoom = null;
      socket.emit('room_left', roomId);
    });

    socket.on('message', (payload: { type: string; data: unknown }) => {
      this.onMessage?.(socket.id, payload.type, payload.data);
    });

    socket.on('broadcast', (payload: { type: string; data: unknown }) => {
      if (!currentRoom) return;
      const room = this.rooms.get(currentRoom);
      if (!room) return;
      for (const [id, peer] of room.clients) {
        if (id !== socket.id) {
          peer.emit('message', { type: payload.type, data: payload.data, senderId: socket.id });
        }
      }
    });

    socket.on('send_to', (payload: { peerId: string; type: string; data: unknown }) => {
      const target = this.io.sockets.sockets.get(payload.peerId);
      if (target) {
        target.emit('message', { type: payload.type, data: payload.data, senderId: socket.id });
      }
    });

    socket.on('ping_req', (timestamp: number) => {
      socket.emit('ping_res', timestamp);
    });

    socket.on('disconnect', () => {
      if (currentRoom) this.removeFromRoom(socket, currentRoom);
      this.onClientDisconnect?.(socket.id, currentRoom);
    });
  }

  private removeFromRoom(socket: Socket, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.clients.delete(socket.id);

    // Notify remaining peers
    for (const [, peer] of room.clients) {
      peer.emit('peer_left', socket.id);
    }

    // Remove empty room
    if (room.clients.size === 0) {
      this.rooms.delete(roomId);
      this.onRoomEmpty?.(roomId);
    }
  }

  private broadcastRoomStates(): void {
    for (const room of this.rooms.values()) {
      if (room.state != null) {
        for (const [, socket] of room.clients) {
          socket.emit('state_update', room.state);
        }
      }
    }
  }
}
