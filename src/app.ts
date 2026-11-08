import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { S3Client } from "@aws-sdk/client-s3";
import type { Pool } from "pg";
import type { Env } from "./config/env";
import { errorHandler } from "./middleware/error";
import { requireAuth } from "./middleware/auth";
import { createAuthRouter } from "./routes/auth";
import { createCategoryRouter } from "./routes/categories";
import { createExpenseRouter } from "./routes/expenses";
import { createHealthRouter } from "./routes/health";
import { createAuthService } from "./services/authService";
import { createCategoryService } from "./services/categoryService";
import { createExpenseService } from "./services/expenseService";

export type AppDeps = {
  env: Env;
  pool: Pool;
  s3: S3Client;
};

export const createApp = ({ env, pool, s3 }: AppDeps) => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.static("public"));

  const authService = createAuthService(pool, env);
  const categoryService = createCategoryService(pool);
  const expenseService = createExpenseService(pool, s3, env);
  const auth = requireAuth(env);

  app.use(createHealthRouter());
  app.use("/api/auth", createAuthRouter(authService));
  app.use("/api/categories", auth, createCategoryRouter(categoryService));
  app.use("/api/expenses", auth, createExpenseRouter(expenseService));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });
  app.use(errorHandler);

  return app;
};
