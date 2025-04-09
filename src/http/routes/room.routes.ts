import { Router } from "express";
import * as RoomController from "../controllers/room.controller";

const router = Router();

router.get("/room/:roomId", RoomController.getRoomInfo);

export default router;
