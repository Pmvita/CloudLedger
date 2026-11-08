import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { ConflictError, UnauthorizedError } from "../../src/errors";
import { createAuthService } from "../../src/services/authService";
import { loadEnv } from "../../src/config/env";
import bcrypt from "bcryptjs";

const env = loadEnv();

const mockPool = (queryImpl: ReturnType<typeof vi.fn>) => ({ query: queryImpl }) as unknown as Pool;

describe("authService", () => {
  it("registers a user and returns a JWT", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ id: "u1", email: "a@b.com", full_name: "Ada", password_hash: "hash" }],
    });
    const service = createAuthService(mockPool(query), env);
    const result = await service.register({
      email: "A@B.com",
      password: "Password123!",
      fullName: "Ada",
    });
    expect(result.user.email).toBe("a@b.com");
    expect(result.token.split(".")).toHaveLength(3);
    expect(query).toHaveBeenCalledOnce();
  });

  it("maps unique-email violations to ConflictError", async () => {
    const query = vi.fn().mockRejectedValue({ code: "23505" });
    const service = createAuthService(mockPool(query), env);
    await expect(
      service.register({ email: "a@b.com", password: "Password123!", fullName: "Ada" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects unknown emails on login", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const service = createAuthService(mockPool(query), env);
    await expect(service.login({ email: "a@b.com", password: "x" })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects a bad password", async () => {
    const passwordHash = await bcrypt.hash("correct-horse", 4);
    const query = vi.fn().mockResolvedValue({
      rows: [{ id: "u1", email: "a@b.com", full_name: "Ada", password_hash: passwordHash }],
    });
    const service = createAuthService(mockPool(query), env);
    await expect(
      service.login({ email: "a@b.com", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
