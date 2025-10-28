/**
 * Add 50 test bots with PROPER StrategyDSL format
 * Compatible with evaluateStrategy in rule-engine.ts
 * Run with: node scripts/add-proper-test-bots.js
 */

const testStrategies = [
  {
    name: "Fresh Hunter",
    dsl: {
      universe: { ageMinutesMax: 30, minLiquidityBNB: 5 },
      entry: { signal: "newLaunch", threshold: 8, maxPositions: 3, allocationPerPositionBNB: 0.05 },
      risk: { stopLossPct: 15, takeProfitPct: 50 },
      exits: { timeLimitMin: 120 },
      blacklist: { honeypot: true }
    }
  },
  {
    name: "Volume Chaser",
    dsl: {
      universe: { minLiquidityBNB: 50 },
      entry: { signal: "volumeSpike", threshold: 2, maxPositions: 3, allocationPerPositionBNB: 0.1 },
      risk: { stopLossPct: 20, takeProfitPct: 40 },
      exits: { timeLimitMin: 180 },
      blacklist: { honeypot: true }
    }
  },
  {
    name: "Holder Lover",
    dsl: {
      universe: { minHolders: 50, minLiquidityBNB: 10 },
      entry: { signal: "socialBuzz", threshold: 1.5, maxPositions: 3, allocationPerPositionBNB: 0.08 },
      risk: { stopLossPct: 25, takeProfitPct: 60 },
      exits: { timeLimitMin: 240 },
      blacklist: { honeypot: true }
    }
  },
  {
    name: "Momentum Trader",
    dsl: {
      universe: { minLiquidityBNB: 20 },
      entry: { signal: "momentum", threshold: 30, maxPositions: 3, allocationPerPositionBNB: 0.12 },
      risk: { stopLossPct: 10, takeProfitPct: 35 },
      exits: { timeLimitMin: 60 },
      blacklist: { honeypot: true, taxPctMax: 10 }
    }
  },
  {
    name: "Diamond Hands",
    dsl: {
      universe: { ageMinutesMax: 1440, minLiquidityBNB: 100 },
      entry: { signal: "momentum", threshold: 20, maxPositions: 2, allocationPerPositionBNB: 0.2 },
      risk: { stopLossPct: 30, takeProfitPct: 100 },
      exits: { timeLimitMin: 600 },
      blacklist: { honeypot: true, ownerRenouncedRequired: true, lpLockedRequired: true }
    }
  },
  {
    name: "Scalper",
    dsl: {
      universe: { minLiquidityBNB: 10 },
      entry: { signal: "momentum", threshold: 5, maxPositions: 5, allocationPerPositionBNB: 0.03 },
      risk: { stopLossPct: 5, takeProfitPct: 15 },
      exits: { timeLimitMin: 30 },
      blacklist: { honeypot: true }
    }
  },
  {
    name: "Whale Watcher",
    dsl: {
      universe: { minLiquidityBNB: 200 },
      entry: { signal: "volumeSpike", threshold: 3, maxPositions: 2, allocationPerPositionBNB: 0.25 },
      risk: { stopLossPct: 15, takeProfitPct: 50 },
      exits: { timeLimitMin: 180 },
      blacklist: { honeypot: true, taxPctMax: 5 }
    }
  },
  {
    name: "Moonshot",
    dsl: {
      universe: { ageMinutesMax: 60, minLiquidityBNB: 30 },
      entry: { signal: "momentum", threshold: 50, maxPositions: 1, allocationPerPositionBNB: 0.3 },
      risk: { stopLossPct: 25, takeProfitPct: 150 },
      exits: { timeLimitMin: 300 },
      blacklist: { honeypot: true }
    }
  },
  {
    name: "Conservative",
    dsl: {
      universe: { ageMinutesMax: 720, minLiquidityBNB: 150, minHolders: 100 },
      entry: { signal: "socialBuzz", threshold: 2, maxPositions: 3, allocationPerPositionBNB: 0.15 },
      risk: { stopLossPct: 10, takeProfitPct: 30 },
      exits: { timeLimitMin: 360 },
      blacklist: { honeypot: true, ownerRenouncedRequired: true, lpLockedRequired: true, taxPctMax: 5 }
    }
  },
  {
    name: "Aggressive",
    dsl: {
      universe: { ageMinutesMax: 15 },
      entry: { signal: "newLaunch", threshold: 9, maxPositions: 4, allocationPerPositionBNB: 0.15 },
      risk: { stopLossPct: 35, takeProfitPct: 200 },
      exits: { timeLimitMin: 90 },
      blacklist: { honeypot: true }
    }
  }
];

async function addProperTestBots() {
  const MATCH_ID = 5;
  const NUM_BOTS = 50;

  console.log('-- Delete old test bots from match 5');
  console.log(`DELETE FROM bots WHERE match_id = ${MATCH_ID};`);
  console.log('');
  console.log('-- Add 50 test bots with proper StrategyDSL format');

  for (let i = 0; i < NUM_BOTS; i++) {
    const strategy = testStrategies[i % testStrategies.length];
    const botNum = i + 1;
    const ownerAddress = `0x${(1000000 + botNum).toString(16).padStart(40, '0')}`;
    const botName = `${strategy.name} #${botNum}`;
    const botDescription = `Test bot ${botNum} using ${strategy.name} strategy`;
    const promptDsl = JSON.stringify(strategy.dsl);
    const createdAt = Math.floor(Date.now() / 1000);
    const promptRaw = `${strategy.name} strategy for trading`;

    console.log(
      `INSERT INTO bots (match_id, owner_address, prompt_raw, prompt_dsl, bot_name, bot_description, created_at) VALUES (${MATCH_ID}, '${ownerAddress}', '${promptRaw}', '${promptDsl.replace(/'/g, "''")}', '${botName}', '${botDescription}', ${createdAt});`
    );
  }
}

addProperTestBots();
