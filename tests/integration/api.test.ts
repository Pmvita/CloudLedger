import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { mockClient } from "aws-sdk-client-mock";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { loadEnv } from "../../src/config/env";
import { runMigrations } from "../../src/db/migrate";
import { runSeed } from "../../src/db/seed";
import { createApp } from "../../src/app";
import { Pool } from "pg";

const runDb = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDb)("API against Postgres", () => {
  const env = loadEnv();
  const s3Mock = mockClient(S3Client);
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const app = createApp({ env, pool, s3: new S3Client({ region: env.AWS_REGION }) });
  let token = "";
  let categoryId = "";
  let expenseId = "";

  beforeAll(async () => {
    s3Mock.on(PutObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});
    await runMigrations(env.DATABASE_URL);
    await runSeed(env.DATABASE_URL);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("registers, logs in, and walks the expense lifecycle", async () => {
    const email = `qa-${Date.now()}@cloudledger.dev`;
    const register = await request(app).post("/api/auth/register").send({
      email,
      password: "Password123!",
      fullName: "QA User",
    });
    expect(register.status).toBe(201);
    token = register.body.token as string;

    const login = await request(app).post("/api/auth/login").send({
      email,
      password: "Password123!",
    });
    expect(login.status).toBe(200);

    const categories = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${token}`);
    expect(categories.status).toBe(200);
    categoryId = categories.body.categories[0].id as string;

    const created = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${token}`)
      .field("amount", "42.15")
      .field("categoryId", categoryId)
      .field("description", "Integration receipt")
      .field("expenseDate", "2026-07-10")
      .attach("receipt", Buffer.from("%PDF-1.4"), {
        filename: "invoice.pdf",
        contentType: "application/pdf",
      });
    expect(created.status).toBe(201);
    expenseId = created.body.id as string;
    expect(created.body.receipt.s3ObjectKey).toMatch(/^receipts\//);

    const listed = await request(app)
      .get("/api/expenses?status=pending")
      .set("Authorization", `Bearer ${token}`);
    expect(listed.body.expenses.some((row: { id: string }) => row.id === expenseId)).toBe(true);

    const fetched = await request(app)
      .get(`/api/expenses/${expenseId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.amount).toBe(42.15);

    const patched = await request(app)
      .patch(`/api/expenses/${expenseId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "approved" });
    expect(patched.body.status).toBe("approved");

    const deleted = await request(app)
      .delete(`/api/expenses/${expenseId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleted.status).toBe(204);
  });
});
