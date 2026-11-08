import { Pool } from "pg";
import type { Env } from "../config/env";

let pool: Pool | undefined;

export const getPool = (env: Env): Pool => {
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
  }
  return pool;
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};
