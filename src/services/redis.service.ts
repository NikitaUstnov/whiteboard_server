import { createClient } from "redis";
import config from "../config";

class RedisService {
  private static instance: RedisService;

  private pubClient: ReturnType<typeof createClient>;
  private subClient: ReturnType<typeof createClient>;

  private isInitialized = false;

  private constructor() {
    this.pubClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          // Экспоненциальная стратегия переподключения с ограничением
          const delay = Math.min(retries * 50, 2000);
          console.log(`Redis reconnecting in ${delay}ms...`);
          return delay;
        },
      },
    });

    this.subClient = this.pubClient.duplicate();

    // Улучшенная обработка ошибок для pubClient
    this.pubClient.on("error", (err) => {
      console.error("Redis pub error:", err);
    });

    this.pubClient.on("connect", () => {
      console.log("Redis pub client connected");
    });

    this.pubClient.on("reconnecting", () => {
      console.log("Redis pub client reconnecting");
    });

    // Улучшенная обработка ошибок для subClient
    this.subClient.on("error", (err) => {
      console.error("Redis sub error:", err);
    });

    this.subClient.on("connect", () => {
      console.log("Redis sub client connected");
    });

    this.subClient.on("reconnecting", () => {
      console.log("Redis sub client reconnecting");
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public async init(): Promise<void> {
    if (!this.isInitialized) {
      try {
        await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
        this.isInitialized = true;
        console.log("Redis service initialized");
      } catch (error) {
        console.error("Failed to initialize Redis service:", error);
        throw error;
      }
    }
  }

  public getPubClient() {
    return this.pubClient;
  }

  public getSubClient() {
    return this.subClient;
  }

  public async get<T>(key: string): Promise<T | null> {
    const data = await this.pubClient.get(`${config.redis.prefix}${key}`);
    return data ? (JSON.parse(data) as T) : null;
  }

  public async set<T>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    const fullKey = `${config.redis.prefix}${key}`;

    if (ttlSeconds) {
      await this.pubClient.setEx(fullKey, ttlSeconds, JSON.stringify(value));
    } else {
      await this.pubClient.set(fullKey, JSON.stringify(value));
    }
  }

  public async del(key: string): Promise<void> {
    await this.pubClient.del(`${config.redis.prefix}${key}`);
  }

  // Новые методы для работы с сессиями Socket.IO
  public async storeSocketSession(
    socketId: string,
    data: Record<string, any>
  ): Promise<void> {
    const key = `socket:${socketId}`;
    await this.set(
      key,
      {
        ...data,
        lastSeen: Date.now(),
      },
      1800
    ); // TTL: 30 минут
  }

  public async getSocketSession(
    socketId: string
  ): Promise<Record<string, any> | null> {
    const key = `socket:${socketId}`;
    return await this.get(key);
  }

  public async updateSocketLastSeen(socketId: string): Promise<void> {
    const key = `socket:${socketId}`;
    const session = await this.get<Record<string, any>>(key);

    if (session) {
      session.lastSeen = Date.now();
      await this.set(key, session, 1800); // TTL: 30 минут
    }
  }

  public async removeSocketSession(socketId: string): Promise<void> {
    const key = `socket:${socketId}`;
    await this.del(key);
  }

  public async close(): Promise<void> {
    await this.pubClient.quit();
    await this.subClient.quit();
    this.isInitialized = false;
    console.log("Redis service closed");
  }
}

export default RedisService;
