import type { Request, Response } from "express";
import type { AuthService } from "../services/authService";
import type { LoginInput, RegisterInput } from "../schemas/auth";

export const createAuthController = (authService: AuthService) => ({
  register: async (req: Request, res: Response): Promise<void> => {
    const result = await authService.register(req.body as RegisterInput);
    res.status(201).json(result);
  },

  login: async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body as LoginInput);
    res.status(200).json(result);
  },
});
