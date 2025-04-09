import { Router } from "express";
import * as StatusController from "../controllers/status.controller";

const router = Router();

router.get("/status", StatusController.getStatus);

export default router;
