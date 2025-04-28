import { TypedSocket, EndSessionEvent } from "../types/types";
import RoomService from "../../services/room.service";

export const handleClientReady = async (socket: TypedSocket): Promise<void> => {
  const roomId = socket.handshake.query.roomId as string;
  console.log(`Client ${socket.id} ready in room ${roomId}`);

  const roomService = RoomService.getInstance();
  const room = await roomService.getRoom(roomId);

  if (room) {
    socket.emit("initial-scene", {
      roomId,
      elements: room.elements,
      appState: room.appState,
    });

    console.log(
      `Set ready state for ${socket.id}, elements: ${room.elements.length}`
    );
  }
};

export const handleEndSession = async (
  socket: TypedSocket,
  data: EndSessionEvent
): Promise<void> => {
  const { roomId } = data;
  console.log(`End session request for room ${roomId} from ${socket.id}`);

  const roomService = RoomService.getInstance();
  const room = await roomService.getRoom(roomId);

  if (room) {
    socket.to(roomId).emit("end-session");
  }
};

export const handleDisconnect = async (
  socket: TypedSocket,
  reason: string
): Promise<void> => {
  const roomId = socket.handshake.query.roomId as string;
  console.log(
    `User ${socket.id} disconnected from room ${roomId}. Reason: ${reason}`
  );

  const roomService = RoomService.getInstance();

  const isEmpty = await roomService.removeUser(roomId, socket.id);

  const room = await roomService.getRoom(roomId);
  if (room) {
    socket.to(roomId).emit("users-update", {
      roomId,
      users: room.users.length,
    });

    socket.to(roomId).emit("cursor-leave", {
      roomId,
      userId: socket.id,
    });
  }

  if (isEmpty) {
    roomService.scheduleRoomDeletion(roomId);
  }
};
