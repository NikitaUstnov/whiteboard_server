import HttpServer from "./http/server";
import SocketServer from "./socket/io";
import RedisService from "./services/redis.service";
import config from "./config";
import http from "http";

class WhiteboardApp {
  private httpServer: HttpServer;
  // private socketServer: SocketServer;
  private redisService: RedisService;

  constructor() {
    this.httpServer = new HttpServer();
    // this.socketServer = new SocketServer(this.httpServer.getServer());
    this.redisService = RedisService.getInstance();
  }

  public async init(): Promise<void> {
    await this.redisService.init();
    console.log("Whiteboard app initialized");
  }

  private startWsServer(server: http.Server): void {
    new SocketServer(server);
    console.log("Socket.IO server started");
  }

  public async start(): Promise<void> {
    await this.init();

    const server = this.httpServer.getServer();

    this.startWsServer(server);

    server.listen(config.server.port, config.server.host, () => {
      console.log(
        `Worker ${process.pid} running on http://${config.server.host}:${config.server.port}`
      );
    });
  }
}

export default WhiteboardApp;
