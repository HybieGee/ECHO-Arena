import { StrategyDSL, StrategyDSLSchema, DEFAULT_STRATEGY } from './schema';

/**
 * Rule-based parser for converting user prompts to DSL
 * This parser uses pattern matching to extract trading strategy parameters
 */

interface ParseResult {
  success: boolean;
  dsl?: StrategyDSL;
  error?: string;
  usedLLM?: boolean;
}

/**
 * Parse a user prompt into a strategy DSL
 * 1. Try rule-based parsing first (fast, deterministic)
 * 2. If that fails, fall back to LLM translation (requires API key in env)
 */
export async function parsePromptToDSL(
  prompt: string,
  llmApiKey?: string
): Promise<ParseResult> {
  // Sanitize input
  const sanitized = sanitizePrompt(prompt);
  if (!sanitized.valid || !sanitized.prompt) {
    return { success: false, error: sanitized.error || 'Invalid prompt' };
  }

  // Store validated prompt for TypeScript's type narrowing
  const validatedPrompt: string = sanitized.prompt;

  // If LLM API key is available, use Claude first for best results
  if (llmApiKey) {
    return await llmParse(validatedPrompt, llmApiKey);
  }

  // Fallback to rule-based parsing if no API key
  const ruleBasedResult = ruleBasedParse(validatedPrompt);
  if (ruleBasedResult.success && ruleBasedResult.dsl) {
    return ruleBasedResult;
  }

  // If all else fails, return error
  return { success: false, error: 'Unable to parse prompt. Try being more specific about entry signals, risk levels, or position sizing.' };
}

/**
 * Sanitize user prompt to prevent injection attacks
 */
function sanitizePrompt(prompt: string): { valid: boolean; prompt?: string; error?: string } {
  if (!prompt || prompt.length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' };
  }

  if (prompt.length > 500) {
    return { valid: false, error: 'Prompt exceeds 500 character limit' };
  }

  // Reject URLs
  if (/https?:\/\//.test(prompt)) {
    return { valid: false, error: 'URLs are not allowed in prompts' };
  }

  // Reject code blocks
  if (/```|`|<script|javascript:|eval\(/.test(prompt)) {
    return { valid: false, error: 'Code blocks and scripts are not allowed' };
  }

  // Basic sanitization
  const cleaned = prompt
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();

  return { valid: true, prompt: cleaned };
}

/**
 * Rule-based parser using pattern matching
 */
function ruleBasedParse(prompt: string): ParseResult {
  const lower = prompt.toLowerCase();
  const dsl: StrategyDSL = JSON.parse(JSON.stringify(DEFAULT_STRATEGY));

  try {
    // Parse signal type
    if (lower.includes('momentum') || lower.includes('trending') || lower.includes('moving up')) {
      dsl.entry.signal = 'momentum';
    } else if (lower.includes('volume spike') || lower.includes('high volume') || lower.includes('volume surge')) {
      dsl.entry.signal = 'volumeSpike';
    } else if (lower.includes('new launch') || lower.includes('newly launched') || lower.includes('fresh token')) {
      dsl.entry.signal = 'newLaunch';
    } else if (lower.includes('social') || lower.includes('trending on twitter') || lower.includes('buzz')) {
      dsl.entry.signal = 'socialBuzz';
    }

    // Parse take profit
    const tpMatch = lower.match(/(?:take profit|tp|target)[:\s]+(\d+)%?/);
    if (tpMatch) {
      dsl.risk.takeProfitPct = parseInt(tpMatch[1]);
    }

    // Parse stop loss
    const slMatch = lower.match(/(?:stop loss|sl|stop)[:\s]+(\d+)%?/);
    if (slMatch) {
      dsl.risk.stopLossPct = parseInt(slMatch[1]);
    }

    // Parse max positions
    const posMatch = lower.match(/(\d+)\s+(?:position|trade|token)/);
    if (posMatch) {
      dsl.entry.maxPositions = parseInt(posMatch[1]);
    }

    // Parse allocation per position
    const allocMatch = lower.match(/(\d+(?:\.\d+)?)\s*bnb\s+per/i);
    if (allocMatch) {
      dsl.entry.allocationPerPositionBNB = parseFloat(allocMatch[1]);
    }

    // Parse liquidity requirements
    const liqMatch = lower.match(/(?:liquidity|pool)[:\s]+(\d+)\s*bnb/i);
    if (liqMatch) {
      dsl.universe.minLiquidityBNB = parseInt(liqMatch[1]);
    }

    // Parse time limits
    const timeMatch = lower.match(/(\d+)\s*(?:hour|hr|h)\s+max/);
    if (timeMatch) {
      dsl.exits.timeLimitMin = parseInt(timeMatch[1]) * 60;
    }

    // Parse trailing stop
    const trailMatch = lower.match(/trailing[:\s]+(\d+)%?/);
    if (trailMatch) {
      dsl.exits.trailingStopPct = parseInt(trailMatch[1]);
    }

    // Parse token age
    const ageMatch = lower.match(/(?:age|launched)[:\s]+(\d+)\s*(?:minute|min|hour|hr)/);
    if (ageMatch) {
      const value = parseInt(ageMatch[1]);
      const isHours = /hour|hr/.test(lower);
      dsl.universe.ageMinutesMax = isHours ? value * 60 : value;
    }

    // Validate the parsed DSL
    const validated = StrategyDSLSchema.parse(dsl);
    return { success: true, dsl: validated, usedLLM: false };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse strategy'
    };
  }
}

/**
 * LLM-based parser using Claude API
 */
async function llmParse(prompt: string, apiKey: string): Promise<ParseResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are an expert AI trading strategist. Analyze the user's prompt and create a HIGHLY CUSTOMIZED, UNIQUE trading strategy that perfectly matches their specific intent and risk profile.

User prompt: "${prompt}"

CRITICAL ANALYSIS FRAMEWORK:
1. RISK PROFILE: Is this user aggressive, moderate, or conservative?
   - Aggressive: "make money", "big wins", "moonshot", "yolo", "high risk high reward"
   - Conservative: "safe", "minimize risk", "protect capital", "steady gains", "low risk"
   - Moderate: "balanced", "reasonable", "smart", "calculated"

2. ENTRY STYLE: What type of tokens are they looking for?
   - New launches: "just releasing", "fresh", "new", "early", "launch"
   - Established: "volume", "holders", "already doing well", "proven", "traction"
   - Momentum: "pumping", "trending", "moving", "breakout", "chart"
   - Social: "buzz", "trending", "hype", "viral", "community"

3. TIME HORIZON: How long do they want to hold?
   - Quick flip: "quick", "fast", "scalp", "in and out", "day trade" → 5-60 min
   - Short term: "short", "few hours", "intraday" → 60-360 min
   - Medium: "hold", "ride", "let it run" → 360-1440 min
   - No limit: not mentioned → 0 (no time limit)

4. POSITION SIZING: How are they managing capital?
   - All-in: "big plays", "large positions", "go big" → 1-2 positions, 0.4-0.8 BNB each
   - Balanced: "diversified", "spread", "multiple" → 3-4 positions, 0.2-0.3 BNB each
   - Scalping: "many small", "lots of trades", "frequent" → 5 positions, 0.15-0.2 BNB each

PARAMETER MAPPING (create TRUE variance based on intent):

**For AGGRESSIVE prompts** ("make money", "big wins"):
- takeProfitPct: 80-300% (hunt for massive gains)
- stopLossPct: 20-40% (willing to take big losses)
- maxPositions: 1-2 (concentrated bets)
- allocationPerPositionBNB: 0.4-0.8 (go big)
- threshold: 0.5-1.5 (enter more trades)
- ageMinutesMax: 30-120 (very new tokens for max upside)
- minLiquidityBNB: 5-20 (accept lower liquidity for gems)

**For CONSERVATIVE prompts** ("play it safe", "minimize risk"):
- takeProfitPct: 15-40% (lock in smaller gains)
- stopLossPct: 5-12% (tight stop losses)
- maxPositions: 4-5 (diversified)
- allocationPerPositionBNB: 0.15-0.25 (smaller positions)
- threshold: 3.0-5.0 (very selective, high quality only)
- ageMinutesMax: 360-2880 (established tokens)
- minLiquidityBNB: 50-200 (high liquidity required)
- minHolders: 200-500 (proven community)

**For tokens "just releasing" / "new launches"**:
- signal: "newLaunch"
- ageMinutesMax: 10-60 (ultra fresh)
- threshold: 0.8-2.0 (aggressive on age scoring)

**For "volume" / "traction" / "already doing well"**:
- signal: "volumeSpike" OR "momentum"
- minLiquidityBNB: 50-200 (needs established liquidity)
- minHolders: 100-500 (proven demand)
- threshold: 2.0-4.0 (selective for quality)

**For "big plays" / "secure big wins"**:
- maxPositions: 1-2
- allocationPerPositionBNB: 0.5-0.8
- takeProfitPct: 100-300%
- stopLossPct: 25-40%

**For "unified stop loss" / "smart take profit"**:
- stopLossPct: 12-18% (consistent risk management)
- takeProfitPct: 40-80% (smart 2.5-4x risk:reward ratio)
- trailingStopPct: 10-20% (capture profits as it runs)

Response Schema:
{
  "universe": {
    "ageMinutesMax": number (1-10080),
    "minLiquidityBNB": number (5-1000),
    "minHolders": number (50-1000)
  },
  "entry": {
    "signal": "momentum" | "volumeSpike" | "newLaunch" | "socialBuzz",
    "threshold": number (0.5-5.0),
    "maxPositions": number (1-5),
    "allocationPerPositionBNB": number (0.1-1.0)
  },
  "risk": {
    "takeProfitPct": number (5-500),
    "stopLossPct": number (5-50),
    "cooldownSec": 5
  },
  "exits": {
    "timeLimitMin": number (0-1440),
    "trailingStopPct": number (0-30)
  },
  "blacklist": {
    "taxPctMax": number (0-100),
    "honeypot": true,
    "ownerRenouncedRequired": boolean,
    "lpLockedRequired": boolean
  }
}

EXAMPLES OF UNIQUE STRATEGIES:

Example 1: "make money, have a unified stop loss strategy, aswell as a smart take profit strategy, where you are able to minimise risk and maximise profits. Ensure you are only trading coins with traction, and look for those big wins on coins that are just realeasing"
→ Analysis: Aggressive + New Launches + Big Wins + Smart Risk Management
→ Strategy:
{
  "universe": {"ageMinutesMax": 60, "minLiquidityBNB": 15, "minHolders": 80},
  "entry": {"signal": "newLaunch", "threshold": 1.2, "maxPositions": 2, "allocationPerPositionBNB": 0.45},
  "risk": {"takeProfitPct": 150, "stopLossPct": 15, "cooldownSec": 5},
  "exits": {"timeLimitMin": 180, "trailingStopPct": 15},
  "blacklist": {"taxPctMax": 10, "honeypot": true, "ownerRenouncedRequired": false, "lpLockedRequired": true}
}

Example 2: "Play it safe and hit the coins with lots of volume and already have lots of holders and doing well, read the chart and look to do big plays that secure big wins, don't ride these tokens for a long time"
→ Analysis: Conservative Entry (established tokens) + Big Plays (concentrated positions) + Short Time Horizon
→ Strategy:
{
  "universe": {"ageMinutesMax": 720, "minLiquidityBNB": 100, "minHolders": 300},
  "entry": {"signal": "volumeSpike", "threshold": 3.5, "maxPositions": 1, "allocationPerPositionBNB": 0.7},
  "risk": {"takeProfitPct": 120, "stopLossPct": 12, "cooldownSec": 5},
  "exits": {"timeLimitMin": 90, "trailingStopPct": 12},
  "blacklist": {"taxPctMax": 8, "honeypot": true, "ownerRenouncedRequired": true, "lpLockedRequired": true}
}

CRITICAL: Create a UNIQUE strategy. NO two prompts should produce the same DSL. Analyze carefully and extract every nuance.

Return ONLY the JSON object, no markdown, no explanation.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ text?: string }>;
    };
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No response from Claude');
    }

    // Extract JSON from response (may be wrapped in markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    const validated = StrategyDSLSchema.parse(parsed);

    return {
      success: true,
      dsl: validated,
      usedLLM: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('LLM parsing error:', errorMessage, error);

    // Return error for debugging
    return {
      success: false,
      error: `Claude API error: ${errorMessage}`,
      usedLLM: true,
    };
  }
}

/**
 * Validate a DSL object
 */
export function validateDSL(dsl: unknown): ParseResult {
  try {
    const validated = StrategyDSLSchema.parse(dsl);
    return { success: true, dsl: validated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid DSL structure'
    };
  }
}
