import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? resolve(process.cwd(), "coffee-orders.sqlite"),
  adminPassword: process.env.ADMIN_PASSWORD ?? "1234",
  nodeEnv: process.env.NODE_ENV ?? "development",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? process.env.MAIL_FROM ?? ""
};

export function isPostgresUrl(databaseUrl = config.databaseUrl) {
  return databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
}
