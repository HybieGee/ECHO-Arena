// Script to create 50 test bots with diverse strategies and unique addresses

const botPrompts = [
  "aggressive momentum trader, buy tokens pumping 50%+, take profit at 100%, stop loss 25%",
  "conservative momentum, only buy 20%+ gains, take profit 30%, tight 10% stop loss",
  "momentum scalper, quick 15% profit targets, 8% stop loss, max 5 positions",
  "trending token hunter, buy strong uptrends, 40% profit target, 15% stop",
  "breakout trader, buy high momentum tokens, 60% target, 20% stop",
  "pump chaser, aggressive 100%+ targets, 30% stop loss, 2 positions max",
  "steady momentum, 25% target, 12% stop, diversified 4 positions",
  "volatile momentum, 200% targets, 40% stop, single position focus",
  "moderate momentum, 35% profit, 15% stop, balanced risk",
  "momentum swing, 50% target, 18% stop, hold for trends",
  "volume spike hunter, buy unusual volume, 30% profit, 15% stop",
  "high volume scalper, quick volume plays, 20% target, 10% stop",
  "volume breakout trader, 50% target on volume spikes, 20% stop",
  "aggressive volume trader, 80% targets, 25% stop loss",
  "conservative volume, 25% profit on high volume, 12% stop",
  "volume momentum combo, 40% target, 18% stop",
  "quick volume flip, 15% target, 8% stop, 5 positions",
  "volume surge trader, 60% profit target, 22% stop",
  "patient volume trader, 35% target, 15% stop",
  "volume whale watcher, 100% targets, 30% stop",
  "new launch sniper, buy tokens under 10 mins old, 50% target, 20% stop",
  "ultra-early launcher, 5 min age max, 100% profit target, 30% stop",
  "fresh token hunter, 30 min max age, 40% target, 15% stop",
  "launch day trader, 1 hour max, 35% profit, 18% stop",
  "brand new only, under 15 mins, 80% target, 25% stop",
  "quick launch flip, 20 min max age, 25% target, 12% stop",
  "new token scalper, 45 min max, 30% profit, 15% stop",
  "fresh launch aggressive, 10 min max, 150% target, 35% stop",
  "early bird trader, 25 min max age, 45% target, 20% stop",
  "launch momentum, 40 min max, 55% profit, 22% stop",
  "social buzz trader, follow trending tokens, 40% target, 18% stop",
  "community hype hunter, buy social momentum, 60% profit, 25% stop",
  "trending token trader, social signals, 35% target, 15% stop",
  "viral token hunter, high social buzz, 80% profit, 28% stop",
  "twitter trend follower, 50% target, 20% stop",
  "community driven trader, 45% profit, 19% stop",
  "social media scalper, 25% quick targets, 12% stop",
  "hype cycle trader, 100% targets on buzz, 30% stop",
  "social sentiment trader, 38% profit, 16% stop",
  "buzz momentum combo, 55% target, 23% stop",
  "balanced trader, momentum + volume, 35% profit, 15% stop",
  "diversified bot, 5 positions, 30% targets, 14% stop",
  "conservative all-around, 20% profit, 10% stop, safe plays",
  "aggressive multi-signal, 120% targets, 32% stop",
  "medium risk trader, 40% profit, 17% stop, 3 positions",
  "swing trader, hold 2 hours max, 45% target, 20% stop",
  "day trader, 30 min positions, 25% profit, 11% stop",
  "patient investor, 4 hour holds, 60% profit, 24% stop",
  "scalp master, 5 positions, 18% quick profits, 9% stop",
  "whale watcher, follow big moves, 70% target, 26% stop",
];

const matchId = 3;

// Generate fake addresses
console.log("-- Insert 50 test bots for match simulation\n");

botPrompts.forEach((prompt, index) => {
  const fakeAddress = `0x${(index + 1).toString(16).padStart(40, '0')}`;
  const botName = `Test Bot ${index + 1}`;
  const sql = `INSERT INTO bots (owner_address, match_id, prompt_raw, prompt_dsl, bot_name) VALUES ('${fakeAddress}', ${matchId}, '${prompt.replace(/'/g, "''")}', '{}', '${botName}');`;
  console.log(sql);
});

console.log("\n-- Total: 50 bots created");
