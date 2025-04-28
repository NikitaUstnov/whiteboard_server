import { TypedSocket, ExcalidrawUpdateEvent } from "../types/types";
import RoomService from "../../services/room.service";
import { TFile } from "../../models/room.types";

export const handleExcalidrawUpdate = async (
  socket: TypedSocket,
  data: ExcalidrawUpdateEvent
): Promise<void> => {
  const roomId = socket.handshake.query.roomId as string;

  if (!data || !data.elements) {
    console.error(`Invalid data received from ${socket.id}`);
    return;
  }

  const roomService = RoomService.getInstance();

  const updated = await roomService.updateElements(
    roomId,
    data.elements,
    data.appState
  );

  if (updated) {
    const room = await roomService.getRoom(roomId);
    if (!room) return;

    const senderId = data.senderId || socket.id;
    socket.to(roomId).emit("excalidraw-update", {
      roomId,
      senderId,
      elements: room.elements,
      appState: room.appState,
    });
  }
};

export const roomFilesUpdate = async (
  socket: TypedSocket,
  data: TFile
): Promise<void> => {
  const roomId = socket.handshake.query.roomId as string;

  console.log(`Room ${roomId} files update received from ${socket.id}`);

  if (!data) {
    console.error(`Invalid data received from ${socket.id}`);
    return;
  }

  const roomService = RoomService.getInstance();
  const updated = await roomService.updateFiles(roomId, data);

  if (updated) {
    const room = await roomService.getRoom(roomId);
    if (!room) return;

    const senderId = socket.id;
    socket.to(roomId).emit("room-files-update", {
      roomId,
      senderId,
      files: room.files,
    });
  }
};
