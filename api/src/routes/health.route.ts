import { Router } from "express";
import { presenceService } from "../services/presenceService";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), live: presenceService.snapshot() });
});

export default router;
