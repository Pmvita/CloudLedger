import { Router } from "express";
import { createCategoryController } from "../controllers/categoryController";
import type { CategoryService } from "../services/categoryService";
import { asyncHandler } from "./asyncHandler";

export const createCategoryRouter = (categoryService: CategoryService): Router => {
  const router = Router();
  const controller = createCategoryController(categoryService);
  router.get("/", asyncHandler(controller.list));
  return router;
};
