/**
 * dashboard/server.ts — Serveur Express standalone (sans dépendances bot)
 *
 * Routes:
 *  GET  /api/auth/discord         — Redirige vers Discord OAuth2
 *  GET  /api/auth/callback        — Callback Discord OAuth2
 *  GET  /api/auth/logout          — Déconnexion
 *  GET  /api/user                 — Profil utilisateur connecté
 *  GET  /api/guilds               — Serveurs où l'user est admin + bot présent
 *  GET  /api/guilds/:id           — Config d'un serveur
 *  POST /api/guilds/:id/settings  — Modifier la config d'un serveur
 *  GET  /api/bot/stats            — Statistiques globales du bot
 *  GET  /api/bot/health           — Health check
 */

import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import axios from "axios";
import * as path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import winston from "winston";

// ─── Logger ───────────────────────────────────────────────────────────────────
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`),
  ),
  transports: [new winston.transports.Console()],
});

// ─── Prisma ───────────────────────────────────────────────────────────────────
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["info", "warn", "error"],
});

// ─── Config ───────────────────────────────────────────────────────────────────
const DISCORD_API = "https://discord.com/api/v10";
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";
const JWT_SECRET = process.env.JWT_SECRET || "shadow-broker-secret-change-me";
const SESSION_COOKIE_NAME = "sb_session";
const REDIRECT_URI =
  process.env.DASHBOARD_REDIRECT_URI || "http://localhost:3721/api/auth/callback";

const OAUTH_SCOPES = "identify guilds";
const OAUTH_URL = `${DISCORD_API}/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(OAUTH_SCOPES)}`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name?: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

// ─── Token helpers ───────────────────────────────────────────────────────────

function createSessionToken(userId: string, accessToken: string): string {
  return jwt.sign({ userId, accessToken }, JWT_SECRET, { expiresIn: "7d" });
}

function verifySessionToken(token: string): { userId: string; accessToken: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; accessToken: string };
  } catch {
    return null;
  }
}

// ─── Middleware d'auth ───────────────────────────────────────────────────────

function authRequired(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "") || req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }

  const session = verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: "Session invalide" });
    return;
  }

  (req as any).session = session;
  next();
}

// ─── Serveur ─────────────────────────────────────────────────────────────────

export async function startDashboardServer(port: number): Promise<number> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Cookie parser simple
  app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie || "";
    const cookies: Record<string, string> = {};
    for (const part of cookieHeader.split(";")) {
      const [key, ...val] = part.trim().split("=");
      if (key) cookies[key] = val.join("=");
    }
    (req as any).cookies = cookies;
    next();
  });

  // Servir les fichiers statiques du frontend
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendDir = path.join(__dirname, "frontend");
  app.use(express.static(frontendDir));

  // ─── Routes OAuth2 ─────────────────────────────────────────────────────────

  app.get("/api/auth/discord", (_req, res) => {
    res.redirect(OAUTH_URL);
  });

  app.get("/api/auth/callback", async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).send("Code manquant");
      return;
    }

    try {
      const tokenResponse = await axios.post(
        `${DISCORD_API}/oauth2/token`,
        new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );

      const { access_token } = tokenResponse.data;

      const userResponse = await axios.get<DiscordUser>(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const user = userResponse.data;
      const sessionToken = createSessionToken(user.id, access_token);

      res.redirect(`/?token=${sessionToken}`);
    } catch (error) {
      logger.error("[Dashboard] Erreur OAuth2 callback:", error);
      res.status(500).send("Erreur d'authentification Discord");
    }
  });

  app.get("/api/auth/logout", (_req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME);
    res.json({ success: true });
  });

  // ─── Routes API ────────────────────────────────────────────────────────────

  app.get("/api/user", authRequired, async (req, res) => {
    const session = (req as any).session;
    try {
      const userResponse = await axios.get<DiscordUser>(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      const user = userResponse.data;
      const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/0.png`;

      res.json({
        id: user.id,
        username: user.username,
        globalName: user.global_name || user.username,
        avatarUrl,
      });
    } catch {
      res.status(401).json({ error: "Token Discord expiré" });
    }
  });

  app.get("/api/guilds", authRequired, async (req, res) => {
    const session = (req as any).session;
    try {
      const guildsResponse = await axios.get<DiscordGuild[]>(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      const userGuilds = guildsResponse.data;
      const adminGuilds = userGuilds.filter(
        (g) => g.owner || (parseInt(g.permissions, 10) & 0x8) === 0x8,
      );

      const botGuildIds = new Set(
        (await prisma.guildConfig.findMany({ select: { guildId: true } })).map((g) => g.guildId),
      );

      const result = adminGuilds.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null,
        botPresent: botGuildIds.has(g.id),
        isOwner: g.owner,
      }));

      res.json({ guilds: result });
    } catch (error) {
      logger.error("[Dashboard] Erreur récupération guilds:", error);
      res.status(500).json({ error: "Erreur récupération serveurs" });
    }
  });

  app.get("/api/guilds/:id", authRequired, async (req, res) => {
    const guildId = String(req.params.id);
    try {
      const guildConfig = await prisma.guildConfig.findUnique({ where: { guildId } });
      if (!guildConfig) {
        res.json({ guildId, configured: false });
        return;
      }
      res.json({ ...guildConfig, configured: true });
    } catch (error) {
      logger.error("[Dashboard] Erreur récupération config guild:", error);
      res.status(500).json({ error: "Erreur récupération config" });
    }
  });

  app.post("/api/guilds/:id/settings", authRequired, async (req, res) => {
    const guildId = String(req.params.id);
    const settings = req.body;
    try {
      const updated = await prisma.guildConfig.upsert({
        where: { guildId },
        create: { guildId, ...settings },
        update: { ...settings },
      });
      res.json({ success: true, config: updated });
    } catch (error) {
      logger.error("[Dashboard] Erreur mise à jour config guild:", error);
      res.status(500).json({ error: "Erreur sauvegarde config" });
    }
  });

  app.get("/api/bot/stats", authRequired, async (_req, res) => {
    try {
      const [totalGuilds, totalLogs, totalSanctions, totalUsers] = await Promise.all([
        prisma.guildConfig.count(),
        prisma.log.count(),
        prisma.sanction.count(),
        prisma.userActivityLog.count(),
      ]);

      res.json({
        totalGuilds,
        totalLogs,
        totalSanctions,
        totalUsers,
        uptime: process.uptime(),
        memoryMb: (process.memoryUsage().rss / (1024 * 1024)).toFixed(1),
      });
    } catch (error) {
      logger.error("[Dashboard] Erreur stats:", error);
      res.status(500).json({ error: "Erreur stats" });
    }
  });

  app.get("/api/bot/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  });

  // Fallback : servir index.html pour les routes non-API
  app.use((req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(__dirname, "frontend", "index.html"));
    } else {
      res.status(404).json({ error: "Route non trouvée" });
    }
  });

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`[Dashboard] Serveur en écoute sur http://localhost:${port}`);
      resolve(port);
    });
    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        logger.warn(`[Dashboard] Port ${port} occupé, essai ${port + 1}`);
        const server2 = app.listen(port + 1, () => resolve(port + 1));
      } else {
        logger.error("[Dashboard] Erreur serveur:", err);
      }
    });
  });
}

// ─── Auto-démarrage ──────────────────────────────────────────────────────────
const isDirectRun =
  process.argv[1]?.includes("dashboard") ||
  process.env.DASHBOARD_DEV === "true" ||
  process.env.RAILWAY_SERVICE_ID !== undefined;
if (isDirectRun) {
  const port = parseInt(process.env.PORT || process.env.DASHBOARD_PORT || "3721");
  void startDashboardServer(port).then((p) => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  🕵️  SHADOW BROKER DASHBOARD              ║`);
    console.log(`  ║  → http://localhost:${p}                 ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  });
}
