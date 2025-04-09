import { User } from "./user.types";
import { CursorData } from "./cursor.types";

export interface AppState {
  viewBackgroundColor: string;
  currentItemFontFamily: number;
  [key: string]: any;
}

export interface RoomData {
  users: User[];
  elements: any[];
  appState: AppState;
  cursors: Record<string, CursorData>;
  lastUpdate: number;
}

export interface Rooms {
  [roomId: string]: RoomData;
}
