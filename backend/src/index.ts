import('apminsight')
  .then(({ default: AgentAPI }) => AgentAPI.config())
  .catch(() => console.log('APM not available in this environment'));

import "dotenv/config";
import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import subjectsRouter from "./routes/subjects";
import usersRouter from "./routes/users";
import classesRouter from "./routes/classes";
import departmentsRouter from "./routes/departments";
import statsRouter from "./routes/stats";
import announcementsRoutes from "./routes/announcements";
import assignmentsRoutes from "./routes/assignments";
import submissionsRoutes from "./routes/submissions";
import enrollmentsRouter from "./routes/enrollments";

import { auth } from "./lib/auth";
import { requireAuth } from "./middleware/requireAuth";

const app = express();
const PORT = 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Better Auth handles its own body parsing — must be registered BEFORE express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// --- Protected routes (require login) ---
app.use("/api/subjects", requireAuth(), subjectsRouter);
app.use("/api/classes", requireAuth(), classesRouter);
app.use("/api/departments", requireAuth(), departmentsRouter);
app.use("/api/stats", requireAuth(), statsRouter);
app.use("/api/enrollments", requireAuth(), enrollmentsRouter);
app.use("/api/announcements", requireAuth(), announcementsRoutes);
app.use("/api/assignments", requireAuth(), assignmentsRoutes);
app.use("/api/submissions", requireAuth(), submissionsRoutes);

// Users route — admin-only for viewing all, or authenticated to view own profile
app.use("/api/users", requireAuth(), usersRouter);

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
