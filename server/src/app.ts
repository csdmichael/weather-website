import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createWeatherRouter } from "./routes/weather.js";
import { getWeatherRepository, type RepositoryProvider } from "./weatherRepository.js";
import type { ApiError } from "./types.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export interface AppOptions {
  repositoryProvider?: RepositoryProvider;
  /** Directory containing the built SPA. Static hosting is skipped when it does not exist. */
  clientDir?: string;
  /** Allowed browser origins for the API. Defaults to same-origin only. */
  allowedOrigins?: string[];
  /** Requests allowed per IP per window. */
  rateLimitMax?: number;
}

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function notFoundBody(): ApiError {
  return { error: { code: "NOT_FOUND", message: "Resource not found." } };
}

export function createApp(options: AppOptions = {}): Express {
  const {
    repositoryProvider = getWeatherRepository,
    clientDir = process.env.CLIENT_DIST_DIR ?? path.join(currentDir, "public"),
    allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
    rateLimitMax = Number(process.env.RATE_LIMIT_MAX ?? 120),
  } = options;

  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());

  if (allowedOrigins.length > 0) {
    app.use("/api", cors({ origin: allowedOrigins, methods: ["GET"] }));
  }

  app.get("/api/health", (_req: Request, res: Response) => {
    try {
      res.json({ status: "ok", states: repositoryProvider().size });
    } catch {
      res.status(503).json({ status: "degraded", states: 0 });
    }
  });

  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitMax,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: { code: "RATE_LIMITED", message: "Too many requests, please try again later." } },
    }),
  );

  app.use("/api", createWeatherRouter(repositoryProvider));

  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json(notFoundBody());
  });

  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir, { index: "index.html", maxAge: "1h" }));
    app.get(/.*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unexpected server error." } });
  });

  return app;
}
