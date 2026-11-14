// Read the secret at request time, not during Next.js route discovery.
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set");
  return new TextEncoder().encode(secret);
}
