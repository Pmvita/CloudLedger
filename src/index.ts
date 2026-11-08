import "dotenv/config";
import { createS3Client } from "./aws/clients";
import { loadEnv } from "./config/env";
import { getPool } from "./db/pool";
import { createApp } from "./app";
import { logger } from "./logger";

const env = loadEnv();
const pool = getPool(env);
const s3 = createS3Client(env);
const app = createApp({ env, pool, s3 });

const server = app.listen(env.PORT, () => {
  logger.info("CloudLedger API listening", { port: env.PORT });
});

const shutdown = () => {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
