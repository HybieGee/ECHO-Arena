import { StrategyDSL } from './schema';

/**
 * Additional validation and safety checks for strategy DSL
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Comprehensive validation of a strategy DSL
 * Checks for logical consistency and safety
 */
export function validateStrategy(dsl: StrategyDSL): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate risk management
  if (dsl.risk.stopLossPct >= dsl.risk.takeProfitPct) {
    warnings.push('Stop loss is greater than or equal to take profit - this may lead to poor risk/reward ratio');
  }

  if (dsl.risk.stopLossPct > 50) {
    warnings.push('Stop loss exceeds 50% - consider reducing risk');
  }

  // Validate position sizing
  const totalAllocation = dsl.entry.maxPositions * dsl.entry.allocationPerPositionBNB;
  if (totalAllocation > 1.0) {
    errors.push(`Total allocation (${totalAllocation.toFixed(2)} BNB) exceeds starting balance (1.0 BNB)`);
  }

  if (dsl.entry.allocationPerPositionBNB < 0.05) {
    warnings.push('Position size is very small (< 0.05 BNB) - may not be effective');
  }

  // Validate universe filters
  if (dsl.universe.minLiquidityBNB < 5) {
    warnings.push('Minimum liquidity is very low - risk of high slippage');
  }

  if (dsl.universe.ageMinutesMax < 60 && dsl.entry.signal === 'newLaunch') {
    warnings.push('Very short token age filter with newLaunch signal - high risk strategy');
  }

  // Validate exit conditions
  if (dsl.exits.timeLimitMin > 1440) {
    errors.push('Time limit exceeds 24 hours (match duration)');
  }

  if (dsl.exits.trailingStopPct < 5) {
    warnings.push('Trailing stop is very tight - may exit positions prematurely');
  }

  // Validate blacklist settings
  if (!dsl.blacklist.honeypot) {
    warnings.push('Honeypot check disabled - high risk of scam tokens');
  }

  if (dsl.blacklist.taxPctMax > 15) {
    warnings.push('High tax tolerance (> 15%) - may reduce profits significantly');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get a human-readable summary of a strategy
 */
export function summarizeStrategy(dsl: StrategyDSL): string[] {
  const summary: string[] = [];

  summary.push(`Signal: ${dsl.entry.signal}`);
  summary.push(`Max positions: ${dsl.entry.maxPositions}`);
  summary.push(`Position size: ${dsl.entry.allocationPerPositionBNB} BNB`);
  summary.push(`Take profit: ${dsl.risk.takeProfitPct}%`);
  summary.push(`Stop loss: ${dsl.risk.stopLossPct}%`);
  summary.push(`Min liquidity: ${dsl.universe.minLiquidityBNB} BNB`);

  if (dsl.blacklist.lpLockedRequired) {
    summary.push('Requires LP locked');
  }

  if (dsl.blacklist.honeypot) {
    summary.push('Honeypot check enabled');
  }

  return summary;
}

/**
 * Convert DSL to display chips for UI
 */
export function dslToChips(dsl: StrategyDSL): Array<{ label: string; color: string }> {
  const chips: Array<{ label: string; color: string }> = [];

  chips.push({ label: dsl.entry.signal, color: 'blue' });
  chips.push({ label: `tp${dsl.risk.takeProfitPct}`, color: 'green' });
  chips.push({ label: `sl${dsl.risk.stopLossPct}`, color: 'red' });
  chips.push({ label: `${dsl.entry.maxPositions}pos`, color: 'purple' });

  if (dsl.blacklist.lpLockedRequired) {
    chips.push({ label: 'lpLocked', color: 'cyan' });
  }

  if (dsl.blacklist.honeypot) {
    chips.push({ label: 'noHoneypot', color: 'cyan' });
  }

  return chips;
}
