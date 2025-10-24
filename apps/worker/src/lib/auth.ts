/**
 * Authentication utilities
 * EIP-191 signature verification
 */

import { verifyMessage } from 'viem';

/**
 * Generate a nonce for signature challenge
 */
export function generateNonce(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * Create challenge message for signing
 */
export function createChallengeMessage(nonce: string, address: string): string {
  return `ECHO Arena Authentication\n\nSign this message to verify your wallet.\n\nAddress: ${address}\nNonce: ${nonce}\n\nThis signature will not trigger any blockchain transaction or cost any gas.`;
}

/**
 * Verify EIP-191 signature
 */
export async function verifySignature(
  message: string,
  signature: `0x${string}`,
  address: `0x${string}`
): Promise<boolean> {
  try {
    const isValid = await verifyMessage({
      address,
      message,
      signature,
    });
    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Store nonce in KV with expiration
 */
export async function storeNonce(
  kv: KVNamespace,
  address: string,
  nonce: string,
  expirationTTL: number = 300 // 5 minutes
): Promise<void> {
  const key = `nonce:${address.toLowerCase()}`;
  await kv.put(key, nonce, { expirationTtl: expirationTTL });
}

/**
 * Verify and consume nonce
 */
export async function verifyAndConsumeNonce(
  kv: KVNamespace,
  address: string,
  nonce: string
): Promise<boolean> {
  const key = `nonce:${address.toLowerCase()}`;
  const storedNonce = await kv.get(key);

  if (!storedNonce || storedNonce !== nonce) {
    return false;
  }

  // Delete nonce after use (single-use)
  await kv.delete(key);
  return true;
}
