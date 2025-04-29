import HttpServer from "./http/server";
import SocketServer from "./socket/io";
import RedisService from "./services/redis.service";
import config from "./config";
import cluster from "cluster";
import process from "process";
import http from "http";

class WhiteboardApp {
  private httpServer: HttpServer;
  private socketServer?: SocketServer;
  private redisService: RedisService;

  constructor() {
    this.httpServer = new HttpServer();
    this.redisService = RedisService.getInstance();
  }

  public async init(): Promise<void> {
    try {
      await this.redisService.init();
      console.log(`Whiteboard app initialized on worker ${process.pid}`);
    } catch (error) {
      console.error(
        `Failed to initialize Whiteboard app on worker ${process.pid}:`,
        error
      );
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await this.init();

      const server = this.httpServer.getServer();

      // Инициализация Socket.IO сервера
      this.socketServer = new SocketServer(server as http.Server);

      // Регистрируем обработчики для корректного завершения
      this.setupShutdownHandlers();

      // В воркере, HTTP-сервер не должен привязываться к порту
      // Мастер-процесс уже занял этот порт и направляет на него запросы
      if (!cluster.isPrimary) {
        // Для воркеров в кластерном режиме порт не указываем -
        // сокеты будут перехватываться через sticky-session
        server.listen(0, config.server.host, () => {
          const address = server.address();
          const port =
            typeof address === "object" && address ? address.port : 0;
          console.log(
            `Worker ${process.pid} running on http://${config.server.host}:${port} (internal)`
          );
        });
      } else {
        // Если код запускается не в кластерном режиме, то нормально слушаем порт
        server.listen(config.server.port, config.server.host, () => {
          console.log(
            `Server running on http://${config.server.host}:${config.server.port}`
          );
        });
      }
    } catch (error) {
      console.error(
        `Error starting Whiteboard app on worker ${process.pid}:`,
        error
      );
      process.exit(1);
    }
  }

  private setupShutdownHandlers(): void {
    // Обработка сигналов завершения работы
    process.on("SIGTERM", this.shutdown.bind(this));
    process.on("SIGINT", this.shutdown.bind(this));
  }

  private async shutdown(): Promise<void> {
    console.log(`Worker ${process.pid} shutting down...`);

    try {
      // Закрываем Redis-соединения
      await this.redisService.close();

      // Закрываем HTTP сервер
      const server = this.httpServer.getServer();
      server.close(() => {
        console.log(`Worker ${process.pid} HTTP server closed`);
        process.exit(0);
      });

      // Устанавливаем таймаут для принудительного завершения
      setTimeout(() => {
        console.log(`Worker ${process.pid} forced shutdown after timeout`);
        process.exit(1);
      }, 5000);
    } catch (error) {
      console.error(`Error during shutdown of worker ${process.pid}:`, error);
      process.exit(1);
    }
  }
}

export default WhiteboardApp;
