import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password";

describe("scrypt password hashing (constitution II: no native addons)", () => {
  it("stores params and salt with the hash", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$32768$8$1$")).toBe(true);
    const parts = hash.split("$");
    expect(parts).toHaveLength(6);
    expect(Buffer.from(parts[4], "base64")).toHaveLength(16); // 16-byte salt
    expect(Buffer.from(parts[5], "base64")).toHaveLength(32);
  });

  it("verifies the correct password and rejects others", async () => {
    const hash = await hashPassword("password123");
    expect(await verifyPassword("password123", hash)).toBe(true);
    expect(await verifyPassword("password124", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
    expect(await verifyPassword("password123", "garbage")).toBe(false);
    expect(await verifyPassword("password123", "scrypt$1$1$1$aaaa$bbbb")).toBe(false);
  });

  it("salts hashes so identical passwords differ", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });
});
