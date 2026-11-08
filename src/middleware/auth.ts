import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Env } from "../config/env";
import { UnauthorizedError } from "../errors";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthenticatedRequest = Request & { user: AuthUser };

export const requireAuth = (env: Env) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }

    const token = header.slice("Bearer ".length);
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      if (typeof payload !== "object" || typeof payload.sub !== "string") {
        next(new UnauthorizedError("Invalid token"));
        return;
      }
      const email = typeof payload.email === "string" ? payload.email : "";
      (req as AuthenticatedRequest).user = { id: payload.sub, email };
      next();
    } catch {
      next(new UnauthorizedError("Invalid token"));
    }
  };
};
