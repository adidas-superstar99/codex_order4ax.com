import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashSecret(secret: string) {
  const trimmed = secret.trim();
  if (!trimmed) {
    throw new Error("SECRET_REQUIRED");
  }

  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(trimmed, salt, 64) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifySecret(secret: string, hashedSecret: string) {
  const trimmed = secret.trim();
  const [salt, storedHash] = hashedSecret.split(":");
  if (!trimmed || !salt || !storedHash) {
    return false;
  }

  const derivedKey = await scrypt(trimmed, salt, 64) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");
  return storedBuffer.length === derivedKey.length && timingSafeEqual(storedBuffer, derivedKey);
}
