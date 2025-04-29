import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { setupWorker } from "@socket.io/sticky";
import http from "http";
import RedisService from "../services/redis.service";
import config from "../config";
import { handleConnection } from "./handlers/connection.handler";
import {
  handleCursorPosition,
  handleCursorLeave,
} from "./handlers/cursor.handler";
import {
  handleExcalidrawUpdate,
  roomFilesUpdate,
} from "./handlers/drawing.handler";
import {
  handleClientReady,
  handleEndSession,
  handleDisconnect,
} from "./handlers/room.handler";
import {
  CursorLeaveEvent,
  CursorPositionEvent,
  EndSessionEvent,
  ExcalidrawUpdateEvent,
  TypedServer,
  TypedSocket,
} from "./types/types";
import { TFile } from "../models/room.types";
import cluster from "cluster";

class SocketServer {
  private io: TypedServer;
  private redisService: RedisService;

  constructor(httpServer: http.Server) {
    this.redisService = RedisService.getInstance();

    // Настройка Worker для sticky-session
    if (!cluster.isPrimary) {
      setupWorker(httpServer);
    }

    this.io = new Server(httpServer, {
      cors: config.socketIO.cors,
      pingTimeout: config.socketIO.pingTimeout,
      pingInterval: config.socketIO.pingInterval,
      maxHttpBufferSize: config.socketIO.maxHttpBufferSize,
      // Важное добавление для кластеризации - позволяет восстанавливать соединения
      connectionStateRecovery: {
        // Максимальный возраст session ID, которые будут приниматься
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 минуты
        // Пропуск middleware для быстрого восстановления
        skipMiddlewares: true,
      },
    });

    this.setupAdapters();
    this.setupErrorHandling();
    this.setupEventHandlers();
  }

  private async setupAdapters(): Promise<void> {
    try {
      // get Redis clients for Socket.IO adapter
      const pubClient = this.redisService.getPubClient();
      const subClient = this.redisService.getSubClient();

      // setup Redis-adapter for scaling Socket.IO
      this.io.adapter(createAdapter(pubClient, subClient));

      console.log(`Socket.IO adapter initialized on worker ${process.pid}`);
    } catch (error) {
      console.error("Failed to setup Socket.IO adapters:", error);
      throw error;
    }
  }

  private setupErrorHandling(): void {
    this.io.engine.on("connection_error", (err: Error) => {
      console.log(`Socket.IO connection error on worker ${process.pid}:`, err);
    });
  }

  private setupEventHandlers(): void {
    this.io.on("connection", async (socket: TypedSocket) => {
      console.log(
        `Client connected on worker ${process.pid}, socket ID: ${socket.id}`
      );

      try {
        // Сохраняем информацию о сессии сокета в Redis
        // Это важно для работы с кластеризацией
        const socketData = {
          workerId: process.pid,
          connectedAt: Date.now(),
        };

        await this.redisService.storeSocketSession(socket.id, socketData);

        // main handlers
        handleConnection(socket);

        // cursor handlers
        socket.on("cursor-position", (data: CursorPositionEvent) => {
          this.redisService.updateSocketLastSeen(socket.id).catch((err) => {
            console.error(`Error updating socket last seen: ${err}`);
          });
          handleCursorPosition(socket, data);
        });

        socket.on("cursor-leave", (data: CursorLeaveEvent) =>
          handleCursorLeave(socket, data)
        );

        // drawing handlers
        socket.on("excalidraw-update", (data: ExcalidrawUpdateEvent) =>
          handleExcalidrawUpdate(socket, data)
        );

        socket.on("room-files-update", (data: TFile) =>
          roomFilesUpdate(socket, data)
        );

        // room handlers
        socket.on("client-ready", () => handleClientReady(socket));

        socket.on("end-session", (data: EndSessionEvent) =>
          handleEndSession(socket, data)
        );

        // disconnect handler
        socket.on("disconnect", async (reason: string) => {
          console.log(
            `Client disconnected from worker ${process.pid}, socket ID: ${socket.id}, reason: ${reason}`
          );

          // Если это не временное отключение, удаляем сессию из Redis
          if (reason !== "transport close" && reason !== "ping timeout") {
            await this.redisService.removeSocketSession(socket.id);
          }

          handleDisconnect(socket, reason);
        });
      } catch (error) {
        console.error(
          `Error handling socket connection on worker ${process.pid}:`,
          error
        );
      }
    });
  }

  public getIO(): TypedServer {
    return this.io;
  }
}

export default SocketServer;
