import crypto from "crypto";

// Base32 alphabet (RFC 4648)
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let result = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_CHARS[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${cleaned[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a random TOTP secret (20 bytes, base32 encoded)
 */
export function generateTotpSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate an otpauth:// URI for QR code scanning
 */
export function generateOtpauthUri(
  secret: string,
  accountName: string,
  issuer: string = "Zelkora.ai"
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return (
    `otpauth://totp/${encodedIssuer}:${encodedAccount}` +
    `?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
  );
}

/**
 * Generate a TOTP code for a given time step (RFC 6238)
 */
function generateTotpCode(secret: string, counter: number): string {
  const key = base32Decode(secret);

  // Convert counter to 8-byte big-endian buffer
  const counterBuf = Buffer.alloc(8);
  let remaining = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }

  // HMAC-SHA1
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuf);
  const hash = hmac.digest();

  // Dynamic truncation (RFC 4226 section 5.4)
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verify a TOTP code with +/- 1 step tolerance (30s window each)
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const currentStep = Math.floor(Date.now() / 1000 / 30);

  // Check previous, current, and next time steps
  for (let offset = -1; offset <= 1; offset++) {
    const expected = generateTotpCode(secret, currentStep + offset);
    if (timingSafeEqual(code, expected)) {
      return true;
    }
  }

  return false;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return crypto.timingSafeEqual(bufA, bufB);
}
