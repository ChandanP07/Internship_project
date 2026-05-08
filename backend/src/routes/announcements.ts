
import express from "express";
import { requireAuth } from "../middleware/requireAuth";
const router = express.Router();

router.get("/", requireAuth(), async (_, res) => {
  res.json({ data: [] });
});

router.post("/", requireAuth(["teacher", "admin"]), async (req, res) => {
  res.json({ success: true, body: req.body });
});

export default router;
