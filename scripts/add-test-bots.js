/**
 * Add 50 test bots to the current match
 * Run with: node scripts/add-test-bots.js
 */

const testStrategies = [
  { name: "Fresh Hunter", dsl: { rules: [{ condition: "ageMins < 10", action: "buy", amount: 0.05 }] } },
  { name: "Volume Chaser", dsl: { rules: [{ condition: "volumeUSD24h > 100000", action: "buy", amount: 0.1 }] } },
  { name: "Holder Lover", dsl: { rules: [{ condition: "holders > 50", action: "buy", amount: 0.08 }] } },
  { name: "Liquidity King", dsl: { rules: [{ condition: "liquidityBNB > 100", action: "buy", amount: 0.15 }] } },
  { name: "Price Pumper", dsl: { rules: [{ condition: "priceChange24h > 20", action: "buy", amount: 0.12 }] } },
  { name: "Safe Bet", dsl: { rules: [{ condition: "lpLocked == true && ownerRenounced == true", action: "buy", amount: 0.2 }] } },
  { name: "Diamond Hands", dsl: { rules: [{ condition: "ageMins > 60", action: "buy", amount: 0.1 }] } },
  { name: "Scalper", dsl: { rules: [{ condition: "priceChange24h > 5", action: "buy", amount: 0.03 }, { condition: "priceChange24h < -5", action: "sell", amount: 0.03 }] } },
  { name: "Whale Watcher", dsl: { rules: [{ condition: "liquidityBNB > 200", action: "buy", amount: 0.25 }] } },
  { name: "Moonshot", dsl: { rules: [{ condition: "priceChange24h > 50", action: "buy", amount: 0.3 }] } },
];

async function addTestBots() {
  const MATCH_ID = 5;
  const NUM_BOTS = 50;

  // Generate SQL INSERT statements
  const inserts = [];

  for (let i = 0; i < NUM_BOTS; i++) {
    const strategy = testStrategies[i % testStrategies.length];
    const botNum = i + 1;
    const ownerAddress = `0x${(1000000 + botNum).toString(16).padStart(40, '0')}`;
    const botName = `${strategy.name} #${botNum}`;
    const botDescription = `Test bot ${botNum} using ${strategy.name} strategy`;
    const promptDsl = JSON.stringify(strategy.dsl);
    const createdAt = Math.floor(Date.now() / 1000);

    const promptRaw = `${strategy.name} strategy for trading`;

    inserts.push(
      `INSERT INTO bots (match_id, owner_address, prompt_raw, prompt_dsl, bot_name, bot_description, created_at) VALUES (${MATCH_ID}, '${ownerAddress}', '${promptRaw}', '${promptDsl.replace(/'/g, "''")}', '${botName}', '${botDescription}', ${createdAt});`
    );
  }

  // Print SQL
  console.log('-- Add 50 test bots to match 5');
  console.log(inserts.join('\n'));
}

addTestBots();
