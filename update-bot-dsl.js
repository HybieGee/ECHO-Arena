// Script to generate UPDATE statements with proper DSL for all 50 test bots
// Each bot gets a DSL structure based on their strategy

const botStrategies = [
  // Momentum traders (1-10) - varying thresholds
  { id: 7, takeProfit: 100, stopLoss: 25, threshold: 1.5, maxPos: 2, allocation: 0.5 },  // aggressive momentum
  { id: 8, takeProfit: 30, stopLoss: 10, threshold: 1.2, maxPos: 3, allocation: 0.33 },  // conservative momentum
  { id: 9, takeProfit: 15, stopLoss: 8, threshold: 1.15, maxPos: 5, allocation: 0.2 },   // momentum scalper
  { id: 10, takeProfit: 40, stopLoss: 15, threshold: 1.3, maxPos: 3, allocation: 0.33 }, // trending token hunter
  { id: 11, takeProfit: 60, stopLoss: 20, threshold: 1.4, maxPos: 2, allocation: 0.5 },  // breakout trader
  { id: 12, takeProfit: 100, stopLoss: 30, threshold: 1.5, maxPos: 2, allocation: 0.5 }, // pump chaser
  { id: 13, takeProfit: 25, stopLoss: 12, threshold: 1.25, maxPos: 4, allocation: 0.25 },// steady momentum
  { id: 14, takeProfit: 200, stopLoss: 40, threshold: 1.6, maxPos: 1, allocation: 1.0 }, // volatile momentum
  { id: 15, takeProfit: 35, stopLoss: 15, threshold: 1.3, maxPos: 3, allocation: 0.33 }, // moderate momentum
  { id: 16, takeProfit: 50, stopLoss: 18, threshold: 1.35, maxPos: 2, allocation: 0.5 }, // momentum swing

  // Volume spike traders (11-20) - high min volume
  { id: 17, takeProfit: 30, stopLoss: 15, threshold: 1.2, maxPos: 3, allocation: 0.33 }, // volume spike hunter
  { id: 18, takeProfit: 20, stopLoss: 10, threshold: 1.15, maxPos: 4, allocation: 0.25 },// high volume scalper
  { id: 19, takeProfit: 50, stopLoss: 20, threshold: 1.3, maxPos: 2, allocation: 0.5 },  // volume breakout
  { id: 20, takeProfit: 80, stopLoss: 25, threshold: 1.4, maxPos: 2, allocation: 0.5 },  // aggressive volume
  { id: 21, takeProfit: 25, stopLoss: 12, threshold: 1.2, maxPos: 3, allocation: 0.33 }, // conservative volume
  { id: 22, takeProfit: 40, stopLoss: 18, threshold: 1.3, maxPos: 3, allocation: 0.33 }, // volume momentum combo
  { id: 23, takeProfit: 15, stopLoss: 8, threshold: 1.15, maxPos: 5, allocation: 0.2 },  // quick volume flip
  { id: 24, takeProfit: 60, stopLoss: 22, threshold: 1.35, maxPos: 2, allocation: 0.5 }, // volume surge trader
  { id: 25, takeProfit: 35, stopLoss: 15, threshold: 1.25, maxPos: 3, allocation: 0.33 },// patient volume
  { id: 26, takeProfit: 100, stopLoss: 30, threshold: 1.5, maxPos: 2, allocation: 0.5 }, // volume whale watcher

  // New launch specialists (21-30) - very short age limits
  { id: 27, takeProfit: 50, stopLoss: 20, threshold: 1.3, maxPos: 3, allocation: 0.33, age: 10 },  // new launch sniper
  { id: 28, takeProfit: 100, stopLoss: 30, threshold: 1.4, maxPos: 2, allocation: 0.5, age: 5 },   // ultra-early launcher
  { id: 29, takeProfit: 40, stopLoss: 15, threshold: 1.25, maxPos: 3, allocation: 0.33, age: 30 }, // fresh token hunter
  { id: 30, takeProfit: 35, stopLoss: 18, threshold: 1.2, maxPos: 3, allocation: 0.33, age: 60 },  // launch day trader
  { id: 31, takeProfit: 80, stopLoss: 25, threshold: 1.4, maxPos: 2, allocation: 0.5, age: 15 },   // brand new only
  { id: 32, takeProfit: 25, stopLoss: 12, threshold: 1.2, maxPos: 4, allocation: 0.25, age: 20 },  // quick launch flip
  { id: 33, takeProfit: 30, stopLoss: 15, threshold: 1.25, maxPos: 3, allocation: 0.33, age: 45 }, // new token scalper
  { id: 34, takeProfit: 150, stopLoss: 35, threshold: 1.5, maxPos: 2, allocation: 0.5, age: 10 },  // fresh launch aggressive
  { id: 35, takeProfit: 45, stopLoss: 20, threshold: 1.3, maxPos: 3, allocation: 0.33, age: 25 },  // early bird trader
  { id: 36, takeProfit: 55, stopLoss: 22, threshold: 1.35, maxPos: 2, allocation: 0.5, age: 40 },  // launch momentum

  // Social buzz traders (31-40) - lower liquidity requirements
  { id: 37, takeProfit: 40, stopLoss: 18, threshold: 1.3, maxPos: 3, allocation: 0.33 }, // social buzz trader
  { id: 38, takeProfit: 60, stopLoss: 25, threshold: 1.35, maxPos: 2, allocation: 0.5 }, // community hype hunter
  { id: 39, takeProfit: 35, stopLoss: 15, threshold: 1.25, maxPos: 3, allocation: 0.33 },// trending token trader
  { id: 40, takeProfit: 80, stopLoss: 28, threshold: 1.4, maxPos: 2, allocation: 0.5 },  // viral token hunter
  { id: 41, takeProfit: 50, stopLoss: 20, threshold: 1.3, maxPos: 3, allocation: 0.33 }, // twitter trend follower
  { id: 42, takeProfit: 45, stopLoss: 19, threshold: 1.3, maxPos: 3, allocation: 0.33 }, // community driven trader
  { id: 43, takeProfit: 25, stopLoss: 12, threshold: 1.2, maxPos: 4, allocation: 0.25 }, // social media scalper
  { id: 44, takeProfit: 100, stopLoss: 30, threshold: 1.5, maxPos: 2, allocation: 0.5 }, // hype cycle trader
  { id: 45, takeProfit: 38, stopLoss: 16, threshold: 1.25, maxPos: 3, allocation: 0.33 },// social sentiment trader
  { id: 46, takeProfit: 55, stopLoss: 23, threshold: 1.35, maxPos: 2, allocation: 0.5 }, // buzz momentum combo

  // Mixed strategies (41-50)
  { id: 47, takeProfit: 35, stopLoss: 15, threshold: 1.25, maxPos: 3, allocation: 0.33 },// balanced trader
  { id: 48, takeProfit: 30, stopLoss: 14, threshold: 1.2, maxPos: 5, allocation: 0.2 },  // diversified bot
  { id: 49, takeProfit: 20, stopLoss: 10, threshold: 1.15, maxPos: 4, allocation: 0.25 },// conservative all-around
  { id: 50, takeProfit: 120, stopLoss: 32, threshold: 1.5, maxPos: 2, allocation: 0.5 }, // aggressive multi-signal
  { id: 51, takeProfit: 40, stopLoss: 17, threshold: 1.3, maxPos: 3, allocation: 0.33 }, // medium risk trader
  { id: 52, takeProfit: 45, stopLoss: 20, threshold: 1.3, maxPos: 2, allocation: 0.5 },  // swing trader
  { id: 53, takeProfit: 25, stopLoss: 11, threshold: 1.2, maxPos: 4, allocation: 0.25 }, // day trader
  { id: 54, takeProfit: 60, stopLoss: 24, threshold: 1.35, maxPos: 2, allocation: 0.5 }, // patient investor
  { id: 55, takeProfit: 18, stopLoss: 9, threshold: 1.15, maxPos: 5, allocation: 0.2 },  // scalp master
  { id: 56, takeProfit: 70, stopLoss: 26, threshold: 1.4, maxPos: 2, allocation: 0.5 },  // whale watcher
];

console.log('-- UPDATE statements to add proper DSL to all 50 test bots\n');

botStrategies.forEach(bot => {
  // Determine signal type based on bot ID
  let signal = "momentum";
  let threshold = bot.threshold;
  let ageMax = bot.age || 1440;

  if (bot.id >= 17 && bot.id <= 26) {
    // Volume spike traders (bots 17-26)
    signal = "volumeSpike";
    threshold = 2.0; // Volume/liquidity ratio threshold
  } else if (bot.id >= 27 && bot.id <= 36) {
    // New launch specialists (bots 27-36)
    signal = "newLaunch";
    threshold = 7.0; // Higher = only newer tokens (score is age-based)
    ageMax = bot.age; // Use their specific age limits (5-60 mins)
  } else if (bot.id >= 37 && bot.id <= 46) {
    // Social buzz traders (bots 37-46)
    signal = "socialBuzz";
    threshold = 2.5; // Log10(holders) threshold
  }
  // Bots 7-16 and 47-56 keep momentum signal

  const dsl = {
    universe: {
      ageMinutesMax: ageMax,
      minLiquidityBNB: 10,
      minHolders: 50
    },
    entry: {
      signal: signal,
      threshold: threshold,
      maxPositions: bot.maxPos,
      allocationPerPositionBNB: bot.allocation
    },
    risk: {
      takeProfitPct: bot.takeProfit,
      stopLossPct: bot.stopLoss,
      cooldownSec: 5
    },
    exits: {
      timeLimitMin: 0,
      trailingStopPct: 0
    },
    blacklist: {
      taxPctMax: 10,
      honeypot: true,
      ownerRenouncedRequired: false,
      lpLockedRequired: true
    }
  };

  const dslStr = JSON.stringify(dsl).replace(/"/g, '""'); // Escape quotes for SQL
  console.log(`UPDATE bots SET prompt_dsl = "${dslStr}" WHERE id = ${bot.id};`);
});

console.log('\n-- Total: 50 bots updated');
