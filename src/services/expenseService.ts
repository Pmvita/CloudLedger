import type { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { deleteReceiptObject, getReceiptDownloadUrl, putReceiptObject, receiptObjectKey } from "../aws/s3";
import type { Env } from "../config/env";
import { NotFoundError } from "../errors";
import type { CreateExpenseInput, ExpenseStatus, ListExpensesQuery } from "../schemas/expense";

type ExpenseRow = {
  id: string;
  amount: string;
  description: string | null;
  expense_date: Date | string;
  status: ExpenseStatus;
  created_at: Date;
  category_id: string;
  category_name: string;
  receipt_key: string | null;
  receipt_type: string | null;
  receipt_size: number | null;
};

export type ReceiptDto = {
  s3ObjectKey: string;
  fileType: string;
  fileSizeBytes: number;
};

export type ExpenseDto = {
  id: string;
  amount: number;
  category: string;
  categoryId: string;
  description: string;
  expenseDate: string;
  status: ExpenseStatus;
  receipt: ReceiptDto | null;
};

export type ReceiptFile = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
};

const formatDate = (value: Date | string): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
};

const toDto = (row: ExpenseRow): ExpenseDto => ({
  id: row.id,
  amount: Number(row.amount),
  category: row.category_name,
  categoryId: row.category_id,
  description: row.description ?? "",
  expenseDate: formatDate(row.expense_date),
  status: row.status,
  receipt:
    row.receipt_key && row.receipt_type && row.receipt_size !== null
      ? {
          s3ObjectKey: row.receipt_key,
          fileType: row.receipt_type,
          fileSizeBytes: row.receipt_size,
        }
      : null,
});

const EXPENSE_SELECT = `
  SELECT
    e.id,
    e.amount::text AS amount,
    e.description,
    e.expense_date,
    e.status,
    e.created_at,
    e.category_id,
    c.name AS category_name,
    r.s3_object_key AS receipt_key,
    r.file_type AS receipt_type,
    r.file_size_bytes AS receipt_size
  FROM expenses e
  JOIN categories c ON c.id = e.category_id
  LEFT JOIN receipts r ON r.expense_id = e.id
`;

export const createExpenseService = (pool: Pool, s3: S3Client, env: Env) => {
  const getOwned = async (userId: string, expenseId: string): Promise<ExpenseRow> => {
    const result = await pool.query<ExpenseRow>(
      `${EXPENSE_SELECT} WHERE e.id = $1 AND e.user_id = $2`,
      [expenseId, userId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundError("Expense not found");
    }
    return row;
  };

  return {
    async list(userId: string, filters: ListExpensesQuery): Promise<ExpenseDto[]> {
      const clauses = ["e.user_id = $1"];
      const values: unknown[] = [userId];

      if (filters.categoryId) {
        values.push(filters.categoryId);
        clauses.push(`e.category_id = $${values.length}`);
      }
      if (filters.status) {
        values.push(filters.status);
        clauses.push(`e.status = $${values.length}`);
      }
      if (filters.from) {
        values.push(filters.from);
        clauses.push(`e.expense_date >= $${values.length}`);
      }
      if (filters.to) {
        values.push(filters.to);
        clauses.push(`e.expense_date <= $${values.length}`);
      }

      const result = await pool.query<ExpenseRow>(
        `${EXPENSE_SELECT}
         WHERE ${clauses.join(" AND ")}
         ORDER BY e.expense_date DESC, e.created_at DESC
         LIMIT 100`,
        values,
      );
      return result.rows.map(toDto);
    },

    async getById(userId: string, expenseId: string): Promise<ExpenseDto> {
      return toDto(await getOwned(userId, expenseId));
    },

    async getReceiptDownloadUrl(userId: string, expenseId: string): Promise<string | null> {
      const row = await getOwned(userId, expenseId);
      if (!row.receipt_key) {
        return null;
      }
      return getReceiptDownloadUrl(s3, env.S3_BUCKET_NAME, row.receipt_key);
    },

    async summary(
      userId: string,
      month?: string,
    ): Promise<{ month: string; total: number; byCategory: { category: string; total: number; count: number }[] }> {
      const monthFilter = month ?? new Date().toISOString().slice(0, 7);
      const result = await pool.query<{ category_name: string; total: string; count: string }>(
        `SELECT c.name AS category_name, COALESCE(SUM(e.amount),0)::text AS total, COUNT(*)::text AS count
         FROM expenses e
         JOIN categories c ON c.id = e.category_id
         WHERE e.user_id = $1 AND to_char(e.expense_date, 'YYYY-MM') = $2
         GROUP BY c.name
         ORDER BY c.name`,
        [userId, monthFilter],
      );
      const byCategory = result.rows.map((r) => ({
        category: r.category_name,
        total: Number(r.total),
        count: Number(r.count),
      }));
      const total = byCategory.reduce((acc, c) => acc + c.total, 0);
      return { month: monthFilter, total, byCategory };
    },

    async create(
      userId: string,
      input: CreateExpenseInput,
      file?: ReceiptFile,
    ): Promise<ExpenseDto> {
      const category = await pool.query("SELECT id FROM categories WHERE id = $1", [
        input.categoryId,
      ]);
      if ((category.rowCount ?? 0) === 0) {
        throw new NotFoundError("Category not found");
      }

      const expenseId = randomUUID();
      let objectKey: string | undefined;

      if (file) {
        objectKey = receiptObjectKey(expenseId, file.originalName);
        await putReceiptObject(s3, env.S3_BUCKET_NAME, objectKey, file.buffer, file.mimeType);
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO expenses (id, user_id, category_id, amount, description, expense_date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [expenseId, userId, input.categoryId, input.amount, input.description, input.expenseDate],
        );
        if (file && objectKey) {
          await client.query(
            `INSERT INTO receipts (expense_id, s3_object_key, file_type, file_size_bytes)
             VALUES ($1, $2, $3, $4)`,
            [expenseId, objectKey, file.mimeType, file.size],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
              await client.query("ROLLBACK");
              if (objectKey) {
                try {
                  await deleteReceiptObject(s3, env.S3_BUCKET_NAME, objectKey);
                } catch (deleteError) {
                  // Log but don't mask the original transaction error
                  console.error("Failed to delete uploaded receipt during rollback:", deleteError);
                }
              }
              throw error;
            } finally {
        client.release();
      }

      return toDto(await getOwned(userId, expenseId));
    },

    async updateStatus(
      userId: string,
      expenseId: string,
      status: ExpenseStatus,
    ): Promise<ExpenseDto> {
      await getOwned(userId, expenseId);
      await pool.query("UPDATE expenses SET status = $1 WHERE id = $2 AND user_id = $3", [
        status,
        expenseId,
        userId,
      ]);
      return toDto(await getOwned(userId, expenseId));
    },

    async remove(userId: string, expenseId: string): Promise<void> {
      const existing = await getOwned(userId, expenseId);
      if (existing.receipt_key) {
        await deleteReceiptObject(s3, env.S3_BUCKET_NAME, existing.receipt_key);
      }
      await pool.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [expenseId, userId]);
    },
  };
};

export type ExpenseService = ReturnType<typeof createExpenseService>;
