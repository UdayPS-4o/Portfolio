import { Router } from "express";
import health from "./health.route";
import stats from "./stats.route";
import admin from "./admin.route";

const router = Router();
router.use(health);
router.use(stats);
router.use(admin);

export default router;
