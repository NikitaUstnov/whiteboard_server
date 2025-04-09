import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { CursorPosition } from "../../models/cursor.types";
import { AppState } from "../../models/room.types";

export interface SocketData {
  roomId: string;
  userName: string;
}

export interface CursorPositionEvent {
  userId: string;
  position: CursorPosition;
  color: string;
  userName?: string;
}

export interface CursorLeaveEvent {
  userId: string;
}

export interface ExcalidrawUpdateEvent {
  elements: any[];
  appState?: AppState;
  senderId?: string;
}

export interface EndSessionEvent {
  roomId: string;
}

export type TypedServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;
export type TypedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;
