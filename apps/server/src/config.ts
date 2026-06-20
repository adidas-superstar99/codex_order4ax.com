import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? resolve(process.cwd(), "coffee-orders.sqlite"),
  adminPassword: process.env.ADMIN_PASSWORD ?? "1234",
  nodeEnv: process.env.NODE_ENV ?? "development",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "",
  hermesApiUrl: process.env.HERMES_API_URL ?? "",
  hermesApiToken: process.env.HERMES_API_TOKEN ?? "",
  hermesWebhookToken: process.env.HERMES_WEBHOOK_TOKEN ?? "",
  hermesMailAccount: process.env.HERMES_MAIL_ACCOUNT ?? ""
};

export function isPostgresUrl(databaseUrl = config.databaseUrl) {
  return databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
}
