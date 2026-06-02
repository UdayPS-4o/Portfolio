import { Router } from "express";
import { adminAuth } from "../middleware/adminAuth";
import { visitRepository } from "../repositories/visitRepository";
import { presenceService } from "../services/presenceService";

const router = Router();

// Admin-only visitor analytics (protected by ADMIN_TOKEN when configured)
router.get("/stats", adminAuth, (_req, res) => {
  res.json({ live: presenceService.snapshot(), ...visitRepository.stats() });
});

router.get("/stats/recent", adminAuth, (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10) || 50, 500);
  res.json({ visits: visitRepository.recent(limit) });
});

export default router;
