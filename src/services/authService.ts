import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Pool } from "pg";
import type { Env } from "../config/env";
import { ConflictError, UnauthorizedError } from "../errors";
import type { LoginInput, RegisterInput } from "../schemas/auth";

const TOKEN_TTL = "12h";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
};

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
};

const toPublicUser = (row: Pick<UserRow, "id" | "email" | "full_name">): PublicUser => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
});

export const createAuthService = (pool: Pool, env: Env) => {
  const signToken = (user: PublicUser): string =>
    jwt.sign({ email: user.email }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: TOKEN_TTL,
    });

  return {
    async register(input: RegisterInput): Promise<{ user: PublicUser; token: string }> {
      const passwordHash = await bcrypt.hash(input.password, 10);
      try {
        const result = await pool.query<UserRow>(
          `INSERT INTO users (email, full_name, password_hash)
           VALUES ($1, $2, $3)
           RETURNING id, email, full_name, password_hash`,
          [input.email.toLowerCase(), input.fullName, passwordHash],
        );
        const row = result.rows[0];
        if (!row) {
          throw new Error("Failed to create user");
        }
        const user = toPublicUser(row);
        return { user, token: signToken(user) };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
        ) {
          throw new ConflictError("Email already registered");
        }
        throw error;
      }
    },

    async login(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
      const result = await pool.query<UserRow>(
        "SELECT id, email, full_name, password_hash FROM users WHERE email = $1",
        [input.email.toLowerCase()],
      );
      const row = result.rows[0];
      if (!row) {
        throw new UnauthorizedError("Invalid email or password");
      }
      const matches = await bcrypt.compare(input.password, row.password_hash);
      if (!matches) {
        throw new UnauthorizedError("Invalid email or password");
      }
      const user = toPublicUser(row);
      return { user, token: signToken(user) };
    },
  };
};

export type AuthService = ReturnType<typeof createAuthService>;
