import { Router } from "express";
import type { AuthService } from "../services/authService";
import { createAuthController } from "../controllers/authController";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../schemas/auth";
import { asyncHandler } from "./asyncHandler";

export const createAuthRouter = (authService: AuthService): Router => {
  const router = Router();
  const controller = createAuthController(authService);

  router.post("/register", validate(registerSchema), asyncHandler(controller.register));
  router.post("/login", validate(loginSchema), asyncHandler(controller.login));

  return router;
};
