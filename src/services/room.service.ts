import { RoomData, Rooms, AppState, TFile } from "../models/room.types";
import { User } from "../models/user.types";
import { CursorData } from "../models/cursor.types";
import RedisService from "./redis.service";
import config from "../config";

class RoomService {
  private static instance: RoomService;
  private rooms: Rooms = {};
  private redis: RedisService;

  private constructor() {
    this.redis = RedisService.getInstance();
  }

  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  /**
   * Get room by id. Check local cache first, then Redis.
   */
  public async getRoom(roomId: string): Promise<RoomData | null> {
    // Check local cache
    if (this.rooms[roomId]) {
      return this.rooms[roomId];
    }

    // Get from Redis
    const room = await this.redis.get<RoomData>(`room:${roomId}`);
    if (room) {
      // Cache locally
      this.rooms[roomId] = room;
      return room;
    }

    return null;
  }

  /**
   * Get all rooms
   */
  public getRooms(): Rooms {
    return this.rooms;
  }

  /**
   * Creates a new room or returns an existing one
   * @param roomId - The ID of the room to get or create
   * @returns The room data
   */
  public async getOrCreateRoom(roomId: string): Promise<RoomData> {
    const room = await this.getRoom(roomId);

    if (room) {
      return room;
    }

    // Create a new room
    const newRoom: RoomData = {
      users: [],
      elements: [],
      appState: {
        viewBackgroundColor: "#ffffff",
        currentItemFontFamily: 1,
      },
      cursors: {},
      lastUpdate: Date.now(),
      files: {},
    };

    // Save the room to Redis and local cache
    await this.saveRoom(roomId, newRoom);

    console.log(`Created new room: ${roomId}`);
    return newRoom;
  }

  /**
   * Save room to redis and local cashe
   */
  public async saveRoom(roomId: string, roomData: RoomData): Promise<void> {
    this.rooms[roomId] = roomData;
    await this.redis.set<RoomData>(`room:${roomId}`, roomData);
  }

  /**
   * Remove room
   */
  public async deleteRoom(roomId: string): Promise<void> {
    delete this.rooms[roomId];
    await this.redis.del(`room:${roomId}`);
    console.log(`Room ${roomId} removed`);
  }

  /**
   * Add user to room
   */
  public async addUser(roomId: string, user: User): Promise<void> {
    const room = await this.getOrCreateRoom(roomId);
    room.users.push(user);
    await this.saveRoom(roomId, room);
  }

  /**
   * Remove user from room
   */
  public async removeUser(roomId: string, userId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    room.users = room.users.filter((user) => user.id !== userId);

    // Remove user cursor
    if (room.cursors && room.cursors[userId]) {
      delete room.cursors[userId];
    }

    await this.saveRoom(roomId, room);

    // Return true if room is empty
    return room.users.length === 0;
  }

  /**
   * Update elements in room with check for update frequency
   */
  public async updateElements(
    roomId: string,
    elements: any[],
    appState?: AppState
  ): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    // Update frequency limit
    const now = Date.now();
    if (now - room.lastUpdate < config.room.updateThrottleMs) {
      return false; // Skip too frequent updates
    }

    room.lastUpdate = now;
    room.elements = JSON.parse(JSON.stringify(elements));

    if (appState) {
      room.appState = {
        ...room.appState,
        ...appState,
      };
    }

    await this.saveRoom(roomId, room);
    return true;
  }

  public async updateFiles(roomId: string, file: TFile): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;

    const fileKey = Object.keys(file)[0];

    if (!room.files) {
      room.files = {};
    }

    if (fileKey in room.files) {
      delete room.files[fileKey];
    }

    Object.assign(room.files, file);
    await this.saveRoom(roomId, room);

    return true;
  }

  /**
   * Update user cursor position
   */
  public async updateCursor(
    roomId: string,
    userId: string,
    cursorData: CursorData
  ): Promise<void> {
    const room = await this.getRoom(roomId);
    if (!room) return;

    if (!room.cursors) {
      room.cursors = {};
    }

    room.cursors[userId] = cursorData;
    await this.saveRoom(roomId, room);
  }

  /**
   * Remove user cursor
   */
  public async removeCursor(roomId: string, userId: string): Promise<void> {
    const room = await this.getRoom(roomId);
    if (!room || !room.cursors) return;

    if (room.cursors[userId]) {
      delete room.cursors[userId];
      await this.saveRoom(roomId, room);
    }
  }

  /**
   * Get room info for API
   */
  public async getRoomInfo(roomId: string): Promise<any | null> {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    return {
      roomId,
      users: room.users.length,
      elementsCount: room.elements ? room.elements.length : 0,
      cursorsCount: Object.keys(room.cursors || {}).length,
    };
  }

  /**
   * Schedule room deletion
   */
  public scheduleRoomDeletion(roomId: string): void {
    setTimeout(async () => {
      const room = await this.getRoom(roomId);
      if (room && room.users.length === 0) {
        await this.deleteRoom(roomId);
      }
    }, config.room.cleanupTimeout);
  }
}

export default RoomService;
