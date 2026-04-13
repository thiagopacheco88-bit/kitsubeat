import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local for CLI usage outside Next.js context
config({ path: ".env.local" });

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
