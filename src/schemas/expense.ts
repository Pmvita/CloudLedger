import { z } from "zod";

export const expenseStatuses = ["pending", "approved", "reimbursed"] as const;
export type ExpenseStatus = (typeof expenseStatuses)[number];

export const createExpenseSchema = z.object({
  amount: z.coerce.number().positive(),
  categoryId: z.string().uuid(),
  description: z.string().max(500).optional().default(""),
  expenseDate: z.string().date(),
});

export const updateExpenseStatusSchema = z.object({
  status: z.enum(expenseStatuses),
});

export const expenseIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listExpensesQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  status: z.enum(expenseStatuses).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseStatusInput = z.infer<typeof updateExpenseStatusSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
