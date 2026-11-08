import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import type { CategoryService } from "../services/categoryService";

export const createCategoryController = (categoryService: CategoryService) => ({
  list: async (_req: Request, res: Response): Promise<void> => {
    const categories = await categoryService.list();
    res.status(200).json({ categories });
  },
});

export const asAuthenticated = (req: Request): AuthenticatedRequest => req as AuthenticatedRequest;
