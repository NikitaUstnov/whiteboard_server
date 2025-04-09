import { Request, Response } from "express";
import RoomService from "../../services/room.service";
import os from "os";

export const getStatus = (req: Request, res: Response): void => {
  const roomService = RoomService.getInstance();

  res.json({
    pid: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpus: os.cpus().length,
    loadavg: os.loadavg(),
    freeMemory: os.freemem(),
    totalMemory: os.totalmem(),

    rooms: {
      quantity: roomService.getRooms(),
    },
  });
};
