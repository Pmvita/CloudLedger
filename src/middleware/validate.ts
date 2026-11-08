import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../errors";

type RequestPart = "body" | "params" | "query";

export const validate =
  (schema: ZodType, part: RequestPart = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(new ValidationError("Request validation failed", result.error.flatten()));
      return;
    }
    req[part] = result.data as typeof req.body;
    next();
  };
