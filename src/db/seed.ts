import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { loadEnv } from "../config/env";

const CATEGORIES = [
  { name: "Travel", description: "Flights, hotels, ground transport" },
  { name: "Meals", description: "Client meals and team lunches" },
  { name: "Office", description: "Supplies and workspace costs" },
  { name: "Software", description: "SaaS and tooling" },
  { name: "Other", description: "Uncategorized expenses" },
] as const;

export const runSeed = async (connectionString: string): Promise<void> => {
  const pool = new Pool({ connectionString });
  try {
    for (const category of CATEGORIES) {
      await pool.query(
        `INSERT INTO categories (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [category.name, category.description],
      );
    }

    const email = "demo@cloudledger.dev";
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const user = await pool.query<{ id: string }>(
      `INSERT INTO users (email, full_name, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [email, "Demo User", passwordHash],
    );

    const userId = user.rows[0]?.id;
    const travel = await pool.query<{ id: string }>("SELECT id FROM categories WHERE name = $1", [
      "Travel",
    ]);
    const travelId = travel.rows[0]?.id;

    if (userId && travelId) {
      const existing = await pool.query("SELECT 1 FROM expenses WHERE user_id = $1 LIMIT 1", [
        userId,
      ]);
      if ((existing.rowCount ?? 0) === 0) {
        await pool.query(
          `INSERT INTO expenses (user_id, category_id, amount, description, expense_date, status)
           VALUES
             ($1, $2, 128.50, 'Client dinner - NYC', '2026-07-10', 'approved'),
             ($1, $2, 64.00, 'Airport taxi', '2026-07-11', 'pending')`,
          [userId, travelId],
        );
      }
    }

    console.log("Seed complete (demo@cloudledger.dev / Password123!)");
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  const env = loadEnv();
  runSeed(env.DATABASE_URL).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
