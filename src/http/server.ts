import express, { Application } from "express";
import http from "http";
import { corsMiddleware } from "./middlewares/cors.middleware";
import RoomRoutes from "./routes/room.routes";
import StatusRoutes from "./routes/status.routes";

class HttpServer {
  private app: Application;
  private server: http.Server;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(corsMiddleware);
  }

  private setupRoutes(): void {
    this.app.use("/api", RoomRoutes);
    this.app.use("/", StatusRoutes);
  }

  public getServer(): http.Server {
    return this.server;
  }

  public getApp(): Application {
    return this.app;
  }
}

export default HttpServer;
