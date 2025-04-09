import { TypedSocket } from "../types/types";
import RoomService from "../../services/room.service";

export const handleConnection = async (socket: TypedSocket): Promise<void> => {
  const roomId = socket.handshake.query.roomId as string;
  const userName = socket.handshake.query.userName as string;

  if (!roomId) {
    socket.disconnect();
    return;
  }

  console.log(
    `User ${userName} connected to room: ${roomId} on worker ${process.pid}`
  );

  // Присоединение к комнате
  socket.join(roomId);

  // Отправка подтверждения клиенту
  socket.emit("connection-success", {
    message: `Successfully connected to room ${roomId}`,
    socketId: socket.id,
  });

  const roomService = RoomService.getInstance();

  // Получаем или создаем комнату
  const room = await roomService.getOrCreateRoom(roomId);

  // Добавляем пользователя в комнату
  await roomService.addUser(roomId, {
    id: socket.id,
    joinedAt: new Date(),
    userName,
  });

  // Уведомляем всех об обновлении количества пользователей
  socket.to(roomId).emit("users-update", {
    roomId,
    users: room.users.length,
  });
  socket.emit("users-update", {
    roomId,
    users: room.users.length,
  });

  // Отправляем исходные данные сцены с задержкой
  setTimeout(() => {
    socket.emit("initial-scene", {
      roomId,
      elements: room.elements,
      appState: room.appState,
    });

    console.log(
      `Set timeout state for ${socket.id}, elements: ${room.elements.length}`
    );

    // Отправка существующих позиций курсоров
    Object.entries(room.cursors || {}).forEach(([userId, cursorData]) => {
      socket.emit("cursor-position", {
        roomId,
        userId,
        position: cursorData.position,
        color: cursorData.color,
      });
    });
  }, 1000);
};
