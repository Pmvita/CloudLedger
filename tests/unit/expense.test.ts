import { describe, expect, it } from "vitest";
import { receiptObjectKey } from "../../src/aws/s3";
import { createExpenseSchema, listExpensesQuerySchema } from "../../src/schemas/expense";

describe("receiptObjectKey", () => {
  it("prefixes receipts/ and sanitizes the file name", () => {
    expect(receiptObjectKey("exp-1", "../invoice 1.PDF")).toBe("receipts/exp-1/.._invoice_1.PDF");
  });
});

describe("expense schemas", () => {
  it("coerces multipart amount strings", () => {
    const parsed = createExpenseSchema.parse({
      amount: "12.50",
      categoryId: "11111111-1111-1111-1111-111111111111",
      expenseDate: "2026-07-10",
    });
    expect(parsed.amount).toBe(12.5);
  });

  it("rejects an invalid status filter", () => {
    expect(() => listExpensesQuerySchema.parse({ status: "paid" })).toThrow();
  });
});
