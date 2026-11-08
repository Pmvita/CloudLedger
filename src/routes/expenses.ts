import { Router } from "express";
import multer from "multer";
import { createExpenseController } from "../controllers/expenseController";
import { validate } from "../middleware/validate";
import {
  createExpenseSchema,
  expenseIdParamsSchema,
  listExpensesQuerySchema,
  updateExpenseStatusSchema,
} from "../schemas/expense";
import type { ExpenseService } from "../services/expenseService";
import { asyncHandler } from "./asyncHandler";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const createExpenseRouter = (expenseService: ExpenseService): Router => {
  const router = Router();
  const controller = createExpenseController(expenseService);

  router.get("/summary", asyncHandler(controller.summary));
  router.get("/", validate(listExpensesQuerySchema, "query"), asyncHandler(controller.list));
  router.get("/:id/receipt-url", validate(expenseIdParamsSchema, "params"), asyncHandler(controller.getReceiptUrl));
  router.post(
    "/",
    upload.single("receipt"),
    validate(createExpenseSchema),
    asyncHandler(controller.create),
  );
  router.get("/:id", validate(expenseIdParamsSchema, "params"), asyncHandler(controller.getById));
  router.patch(
    "/:id",
    validate(expenseIdParamsSchema, "params"),
    validate(updateExpenseStatusSchema),
    asyncHandler(controller.updateStatus),
  );
  router.delete("/:id", validate(expenseIdParamsSchema, "params"), asyncHandler(controller.remove));

  return router;
};
