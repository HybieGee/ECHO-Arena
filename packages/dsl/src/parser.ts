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

  // Try rule-based parsing first
  const ruleBasedResult = ruleBasedParse(validatedPrompt);
  if (ruleBasedResult.success && ruleBasedResult.dsl) {
    return ruleBasedResult;
  }

  // Fallback to LLM if available
  if (llmApiKey) {
    return await llmParse(validatedPrompt, llmApiKey);
  }

  // If all else fails, return the rule-based attempt or error
  return ruleBasedResult.success
    ? ruleBasedResult
    : { success: false, error: 'Unable to parse prompt. Try being more specific about entry signals, risk levels, or position sizing.' };
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
            content: `You are a trading strategy parser. Convert this user prompt into a JSON trading strategy DSL.

User prompt: "${prompt}"

Respond ONLY with valid JSON matching this schema:
{
  "entry": {
    "signal": "momentum" | "volumeSpike" | "newLaunch" | "socialBuzz",
    "maxPositions": 1-5,
    "allocationPerPositionBNB": 0.5-10
  },
  "risk": {
    "takeProfitPct": 5-500,
    "stopLossPct": 5-50
  },
  "exits": {
    "trailingStopPct": 0-30,
    "timeLimitMin": 0-1440
  },
  "universe": {
    "minLiquidityBNB": 10-1000,
    "ageMinutesMax": 1-10080
  }
}

Extract the strategy parameters from the user's intent. If not specified, use sensible defaults:
- signal: "momentum" (most common)
- maxPositions: 3
- allocationPerPositionBNB: 2
- takeProfitPct: 20
- stopLossPct: 15
- trailingStopPct: 0
- timeLimitMin: 0 (no limit)
- minLiquidityBNB: 50
- ageMinutesMax: 10080 (1 week)

Return ONLY the JSON object, no explanation.`,
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
    console.error('LLM parsing error:', error);

    // Fallback to default strategy on error
    try {
      const validated = StrategyDSLSchema.parse(DEFAULT_STRATEGY);
      return {
        success: true,
        dsl: validated,
        usedLLM: true,
      };
    } catch {
      return {
        success: false,
        error: 'LLM parsing failed',
        usedLLM: true,
      };
    }
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
