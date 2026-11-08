import type { Pool } from "pg";
import { NotFoundError } from "../errors";

type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
};

export const createCategoryService = (pool: Pool) => ({
  async list(): Promise<Category[]> {
    const result = await pool.query<CategoryRow>(
      "SELECT id, name, description FROM categories ORDER BY name",
    );
    return result.rows;
  },

  async getById(id: string): Promise<Category> {
    const result = await pool.query<CategoryRow>(
      "SELECT id, name, description FROM categories WHERE id = $1",
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundError("Category not found");
    }
    return row;
  },
});

export type CategoryService = ReturnType<typeof createCategoryService>;
