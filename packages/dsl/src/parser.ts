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
            content: `You are an expert trading strategy parser. Your job is to accurately interpret each user's UNIQUE trading strategy from their prompt and convert it to a precise JSON DSL.

User prompt: "${prompt}"

CRITICAL RULES:
1. Each user's prompt should result in a UNIQUE strategy - extract their specific intent, don't use defaults unless necessary
2. Pay close attention to: entry signals, risk tolerance, position sizing, time horizons
3. Interpret aggressive/conservative language into appropriate percentages
4. Extract ANY numbers mentioned (%, BNB amounts, time periods)

Signal Types (choose the ONE that best matches their intent):
- "momentum": Price trending up, moving averages, price action, bullish movement, pumping
- "volumeSpike": High volume, volume surge, unusual activity, volume breakout
- "newLaunch": New tokens, fresh launches, recently launched, new listings, early entry
- "socialBuzz": Twitter trending, social media, community hype, viral tokens

Parameter Extraction Guide:
- takeProfitPct: Look for "profit", "target", "gain", "up X%", "sell at X%" (5-500%)
  * Conservative: 10-30%, Moderate: 30-100%, Aggressive: 100-500%
- stopLossPct: Look for "loss", "stop", "risk", "down X%", "cut losses" (5-50%)
  * Tight: 5-10%, Normal: 10-20%, Loose: 20-50%
- maxPositions: "X tokens", "X positions", "diversified", "focused" (1-5)
  * Focused: 1-2, Balanced: 3, Diversified: 4-5
- allocationPerPositionBNB: "X BNB each", "per token", "per position" (0.1-1.0)
- threshold: Entry signal strength multiplier (0.5-5.0)
  * Selective: 3-5, Moderate: 2-3, Aggressive: 0.5-2
- timeLimitMin: "hold for X hours/minutes", "quick flip", "day trade" (0-1440)
  * Quick: 5-30 min, Day: 60-480 min, No limit: 0
- ageMinutesMax: "new tokens only", "within X hours", "fresh launches" (1-10080)
  * Very new: 5-60 min, New: 60-360 min, Any: 1440+ min

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

IMPORTANT: Interpret the user's EXACT intent. Don't default to generic values. Extract their unique strategy.

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
