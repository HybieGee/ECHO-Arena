/**
 * Free week gate utilities
 * Checks if a wallet is eligible for free bot spawn
 */

/**
 * Check if current time is within free week window
 */
export function isWithinFreeWeek(freeStart: string, freeEnd: string): boolean {
  try {
    const now = new Date();
    const start = new Date(freeStart);
    const end = new Date(freeEnd);

    return now >= start && now <= end;
  } catch (error) {
    console.error('Error parsing free week dates:', error);
    return false;
  }
}

/**
 * Check if address has already used their free spawn
 */
export async function hasUsedFreeSpawn(
  db: D1Database,
  address: string
): Promise<boolean> {
  const result = await db
    .prepare('SELECT id FROM bots WHERE owner_address = ? LIMIT 1')
    .bind(address.toLowerCase())
    .first();

  return result !== null;
}

/**
 * Check if address is eligible for free spawn
 */
export async function checkFreeEligibility(
  db: D1Database,
  address: string,
  freeStart: string,
  freeEnd: string
): Promise<{
  eligible: boolean;
  reason?: string;
}> {
  // Check if within free week
  if (!isWithinFreeWeek(freeStart, freeEnd)) {
    return {
      eligible: false,
      reason: 'Free week has ended',
    };
  }

  // Check if already used free spawn
  const alreadyUsed = await hasUsedFreeSpawn(db, address);
  if (alreadyUsed) {
    return {
      eligible: false,
      reason: 'Free spawn already used',
    };
  }

  return { eligible: true };
}
