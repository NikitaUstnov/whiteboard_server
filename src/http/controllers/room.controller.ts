import { Request, Response } from "express";
import RoomService from "../../services/room.service";

export const getRoomInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { roomId } = req.params;

  const roomService = RoomService.getInstance();
  const roomInfo = await roomService.getRoomInfo(roomId);

  if (roomInfo) {
    res.json(roomInfo);
  } else {
    res.status(404).json({ error: "Room not found" });
  }
};
