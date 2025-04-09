import {
  TypedSocket,
  CursorPositionEvent,
  CursorLeaveEvent,
} from "../types/types";
import RoomService from "../../services/room.service";

/**
 * Handle cursor position event
 */
export const handleCursorPosition = async (
  socket: TypedSocket,
  data: CursorPositionEvent
): Promise<void> => {
  const roomId = socket.handshake.query.roomId as string;
  const { userId, position, color, userName } = data;

  const roomService = RoomService.getInstance();

  // save cursor position
  await roomService.updateCursor(roomId, userId, { position, color });

  // send cursor position to all other users in the room
  socket.to(roomId).emit("cursor-position", {
    roomId,
    userId,
    userName,
    position,
    color,
  });
};

/**
 * Handle cursor leave event
 */
export const handleCursorLeave = async (
  socket: TypedSocket,
  data: CursorLeaveEvent
): Promise<void> => {
  const roomId = socket.handshake.query.roomId as string;
  const { userId } = data;

  const roomService = RoomService.getInstance();

  // remove cursor data
  await roomService.removeCursor(roomId, userId);

  // notify other users
  socket.to(roomId).emit("cursor-leave", {
    roomId,
    userId,
  });
};
