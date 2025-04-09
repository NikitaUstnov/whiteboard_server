import { TypedSocket, ExcalidrawUpdateEvent } from "../types/types";
import RoomService from "../../services/room.service";

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

  // Обновляем элементы в комнате с ограничением частоты обновлений
  const updated = await roomService.updateElements(
    roomId,
    data.elements,
    data.appState
  );

  if (updated) {
    const room = await roomService.getRoom(roomId);
    if (!room) return;

    // Отправляем обновления всем, КРОМЕ отправителя
    const senderId = data.senderId || socket.id;
    socket.to(roomId).emit("excalidraw-update", {
      roomId,
      senderId,
      elements: room.elements,
      appState: room.appState,
    });
  }
};
