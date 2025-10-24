/**
 * Burn verification utilities
 * Verifies $ECHO token burns on BSC using viem
 */

import { createPublicClient, http, parseAbiItem, type Address } from 'viem';
import { bsc } from 'viem/chains';

const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

// ERC20 Transfer event ABI
const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

/**
 * Verify a burn transaction on BSC
 * Checks that the transaction:
 * 1. Is successful
 * 2. Contains a Transfer event to the dead address
 * 3. The from address matches the expected user
 * 4. The token address matches $ECHO
 * 5. The amount is >= required amount (with 0.1% tolerance)
 */
export async function verifyBurnTransaction(
  rpcUrl: string,
  txHash: `0x${string}`,
  expectedFrom: Address,
  expectedToken: Address,
  requiredAmount: bigint
): Promise<{
  valid: boolean;
  amount?: bigint;
  error?: string;
}> {
  try {
    // Create viem client
    const client = createPublicClient({
      chain: bsc,
      transport: http(rpcUrl),
    });

    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: txHash,
    });

    // Check if transaction succeeded
    if (receipt.status !== 'success') {
      return { valid: false, error: 'Transaction failed' };
    }

    // Find Transfer event to dead address
    const transferLog = receipt.logs.find((log) => {
      // Check if it's from the expected token contract
      if (log.address.toLowerCase() !== expectedToken.toLowerCase()) {
        return false;
      }

      // Check if it's a Transfer event
      if (log.topics[0] !== TRANSFER_EVENT.topics[0]) {
        return false;
      }

      // Check if it's to the dead address
      const toAddress = `0x${log.topics[2]?.slice(26)}` as Address;
      return toAddress.toLowerCase() === DEAD_ADDRESS.toLowerCase();
    });

    if (!transferLog) {
      return { valid: false, error: 'No burn transfer found' };
    }

    // Decode the transfer amount
    const fromAddress = `0x${transferLog.topics[1]?.slice(26)}` as Address;
    const amount = BigInt(transferLog.data);

    // Verify the from address matches
    if (fromAddress.toLowerCase() !== expectedFrom.toLowerCase()) {
      return {
        valid: false,
        error: `Transfer from wrong address. Expected ${expectedFrom}, got ${fromAddress}`,
      };
    }

    // Verify amount (allow 0.1% tolerance for rounding)
    const minAmount = (requiredAmount * 999n) / 1000n;
    if (amount < minAmount) {
      return {
        valid: false,
        error: `Insufficient burn amount. Required ${requiredAmount.toString()}, got ${amount.toString()}`,
      };
    }

    return {
      valid: true,
      amount,
    };
  } catch (error) {
    console.error('Burn verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Check if a transaction hash has already been used for a burn
 */
export async function checkDuplicateBurn(
  db: D1Database,
  txHash: string
): Promise<boolean> {
  const result = await db
    .prepare('SELECT id FROM burns WHERE tx_hash = ? LIMIT 1')
    .bind(txHash.toLowerCase())
    .first();

  return result !== null;
}

/**
 * Record a verified burn in the database
 */
export async function recordBurn(
  db: D1Database,
  ownerAddress: string,
  txHash: string,
  amountEcho: string,
  amountBnbEquiv: number
): Promise<boolean> {
  try {
    const result = await db
      .prepare(
        'INSERT INTO burns (owner_address, tx_hash, amount_echo, amount_bnb_equiv, ts, verified) VALUES (?, ?, ?, ?, ?, 1)'
      )
      .bind(
        ownerAddress.toLowerCase(),
        txHash.toLowerCase(),
        amountEcho,
        amountBnbEquiv,
        Math.floor(Date.now() / 1000)
      )
      .run();

    return result.success;
  } catch (error) {
    console.error('Error recording burn:', error);
    return false;
  }
}
