import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app";
import { loadEnv } from "../../src/config/env";
import { S3Client } from "@aws-sdk/client-s3";
import type { Pool } from "pg";

const env = loadEnv();

describe("HTTP app", () => {
  it("returns ok on /health without a database", async () => {
    const app = createApp({
      env,
      pool: { query: vi.fn() } as unknown as Pool,
      s3: new S3Client({ region: "us-east-1" }),
    });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("rejects unauthenticated expense list", async () => {
    const app = createApp({
      env,
      pool: { query: vi.fn() } as unknown as Pool,
      s3: new S3Client({ region: "us-east-1" }),
    });
    const res = await request(app).get("/api/expenses");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
