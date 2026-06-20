import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? resolve(process.cwd(), "coffee-orders.sqlite"),
  adminPassword: process.env.ADMIN_PASSWORD ?? "1234",
  nodeEnv: process.env.NODE_ENV ?? "development",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "",
  smtpHost: process.env.SMTP_HOST ?? "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  mailFrom: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? ""
};

export function isPostgresUrl(databaseUrl = config.databaseUrl) {
  return databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
}
