import type { Request, Response } from "express";
import { ValidationError } from "../errors";
import { asAuthenticated } from "./categoryController";
import type { CreateExpenseInput, ListExpensesQuery } from "../schemas/expense";
import type { ExpenseService, ReceiptFile } from "../services/expenseService";

const ALLOWED_RECEIPT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const receiptFromRequest = (req: Request): ReceiptFile | undefined => {
  const file = req.file;
  if (!file) {
    return undefined;
  }
  if (!ALLOWED_RECEIPT_TYPES.has(file.mimetype)) {
    throw new ValidationError("Receipt must be a PDF, JPEG, or PNG");
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new ValidationError("Receipt must be 5MB or smaller");
  }
  return {
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
};

export const createExpenseController = (expenseService: ExpenseService) => ({
  list: async (req: Request, res: Response): Promise<void> => {
    const { user } = asAuthenticated(req);
    const expenses = await expenseService.list(user.id, req.query as ListExpensesQuery);
    res.status(200).json({ expenses });
  },

  create: async (req: Request, res: Response): Promise<void> => {
    const { user } = asAuthenticated(req);
    const expense = await expenseService.create(
      user.id,
      req.body as CreateExpenseInput,
      receiptFromRequest(req),
    );
    res.status(201).json(expense);
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    const { user } = asAuthenticated(req);
    const expense = await expenseService.getById(user.id, req.params.id as string);
    res.status(200).json(expense);
  },

  updateStatus: async (req: Request, res: Response): Promise<void> => {
    const { user } = asAuthenticated(req);
    const expense = await expenseService.updateStatus(
      user.id,
      req.params.id as string,
      req.body.status,
    );
    res.status(200).json(expense);
  },

  getReceiptUrl: async (req: Request, res: Response): Promise<void> => {
    const { user } = asAuthenticated(req);
    const url = await expenseService.getReceiptDownloadUrl(user.id, req.params.id as string);
    if (!url) {
      res.status(404).json({ error: "No receipt" });
      return;
    }
    res.status(200).json({ url });
  },

  summary: async (req: Request, res: Response): Promise<void> => {
    const { user } = asAuthenticated(req);
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const data = await expenseService.summary(user.id, month);
    res.status(200).json(data);
  },

  remove: async (req: Request, res: Response): Promise<void> => {
    const { user } = asAuthenticated(req);
    await expenseService.remove(user.id, req.params.id as string);
    res.status(204).send();
  },
});
