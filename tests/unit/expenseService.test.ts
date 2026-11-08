import { mockClient } from "aws-sdk-client-mock";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { describe, expect, it, vi } from "vitest";
import { loadEnv } from "../../src/config/env";
import { NotFoundError } from "../../src/errors";
import { createExpenseService } from "../../src/services/expenseService";
import type { Pool } from "pg";

const env = loadEnv();
const s3Mock = mockClient(S3Client);

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

const baseRow = {
  id: "e1",
  amount: "128.50",
  description: "Client dinner - NYC",
  expense_date: "2026-07-10",
  status: "pending" as const,
  created_at: new Date("2026-07-10T12:00:00Z"),
  category_id: "c1",
  category_name: "Travel",
  receipt_key: "receipts/e1/invoice.pdf",
  receipt_type: "application/pdf",
  receipt_size: 20480,
};

describe("expenseService", () => {
  it("lists expenses for the authenticated user", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [baseRow] });
    const service = createExpenseService({ query } as unknown as Pool, new S3Client({}), env);
    const expenses = await service.list("user-1", {});
    expect(expenses).toHaveLength(1);
    expect(expenses[0]?.amount).toBe(128.5);
    expect(expenses[0]?.receipt?.s3ObjectKey).toBe("receipts/e1/invoice.pdf");
  });

  it("throws when the category does not exist", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const service = createExpenseService({ query } as unknown as Pool, new S3Client({}), env);
    await expect(
      service.create("user-1", {
        amount: 10,
        categoryId: "11111111-1111-1111-1111-111111111111",
        description: "x",
        expenseDate: "2026-07-10",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("uploads to S3 then deletes the object if the transaction fails", async () => {
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});

    const connect = vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("db down")),
      release: vi.fn(),
    });
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ id: "c1" }], rowCount: 1 });

    const service = createExpenseService(
      { query, connect } as unknown as Pool,
      new S3Client({ region: "us-east-1" }),
      env,
    );

    await expect(
      service.create(
        "user-1",
        {
          amount: 10,
          categoryId: "11111111-1111-1111-1111-111111111111",
          description: "x",
          expenseDate: "2026-07-10",
        },
        {
          buffer: Buffer.from("pdf"),
          originalName: "invoice.pdf",
          mimeType: "application/pdf",
          size: 3,
        },
      ),
    ).rejects.toThrow("db down");

    expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1);
    expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1);
  });

  it("does not create expense if S3 upload fails", async () => {
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).rejects(new Error("S3 unavailable"));

    const query = vi.fn().mockResolvedValueOnce({ rows: [{ id: "c1" }], rowCount: 1 });
    const connect = vi.fn().mockResolvedValue({ query: vi.fn(), release: vi.fn() });

    const service = createExpenseService(
      { query, connect } as unknown as Pool,
      new S3Client({ region: "us-east-1" }),
      env,
    );

    await expect(
      service.create(
        "user-1",
        {
          amount: 10,
          categoryId: "11111111-1111-1111-1111-111111111111",
          description: "x",
          expenseDate: "2026-07-10",
        },
        {
          buffer: Buffer.from("pdf"),
          originalName: "invoice.pdf",
          mimeType: "application/pdf",
          size: 3,
        },
      ),
    ).rejects.toThrow("S3 unavailable");

    expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1);
    expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(0);
  });

  it("rolls back S3 delete failure does not mask original error", async () => {
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).rejects(new Error("delete failed"));

    const connect = vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("db down")),
      release: vi.fn(),
    });
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ id: "c1" }], rowCount: 1 });

    const service = createExpenseService(
      { query, connect } as unknown as Pool,
      new S3Client({ region: "us-east-1" }),
      env,
    );

    await expect(
      service.create(
        "user-1",
        {
          amount: 10,
          categoryId: "11111111-1111-1111-1111-111111111111",
          description: "x",
          expenseDate: "2026-07-10",
        },
        {
          buffer: Buffer.from("pdf"),
          originalName: "invoice.pdf",
          mimeType: "application/pdf",
          size: 3,
        },
      ),
    ).rejects.toThrow("db down");

    expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1);
  });

  it("returns null download URL when no receipt exists", async () => {
    const rowNoReceipt = { ...baseRow, receipt_key: null, receipt_type: null, receipt_size: null };
    const query = vi.fn().mockResolvedValue({ rows: [rowNoReceipt] });
    const service = createExpenseService({ query } as unknown as Pool, new S3Client({}), env);
    const url = await service.getReceiptDownloadUrl("user-1", "e1");
    expect(url).toBeNull();
  });

  it("returns presigned URL when receipt exists", async () => {
    s3Mock.reset();
    const signedUrl = "https://s3.amazonaws.com/bucket/receipts/e1/invoice.pdf?signature=xyz";
    vi.mocked(getSignedUrl).mockResolvedValue(signedUrl);

    const query = vi.fn().mockResolvedValue({ rows: [baseRow] });
    const service = createExpenseService({ query } as unknown as Pool, new S3Client({}), env);
    const url = await service.getReceiptDownloadUrl("user-1", "e1");
    expect(url).toBe(signedUrl);
    expect(getSignedUrl).toHaveBeenCalled();
  });

  it("returns summary by month with category breakdown", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        { category_name: "Travel", total: "500.00", count: "2" },
        { category_name: "Meals", total: "150.50", count: "1" },
      ],
    });
    const service = createExpenseService({ query } as unknown as Pool, new S3Client({}), env);
    const summary = await service.summary("user-1", "2026-07");
    expect(summary.month).toBe("2026-07");
    expect(summary.total).toBe(650.5);
    expect(summary.byCategory).toEqual([
      { category: "Travel", total: 500, count: 2 },
      { category: "Meals", total: 150.5, count: 1 },
    ]);
  });

  it("deletes the S3 object when removing an expense with a receipt", async () => {
    s3Mock.reset();
    s3Mock.on(DeleteObjectCommand).resolves({});
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [baseRow] })
      .mockResolvedValueOnce({ rows: [] });
    const service = createExpenseService(
      { query } as unknown as Pool,
      new S3Client({ region: "us-east-1" }),
      env,
    );
    await service.remove("user-1", "e1");
    expect(s3Mock.commandCalls(DeleteObjectCommand)[0]?.args[0].input).toMatchObject({
      Key: "receipts/e1/invoice.pdf",
      Bucket: env.S3_BUCKET_NAME,
    });
  });
});
