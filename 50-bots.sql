-- Insert 50 test bots for match simulation
-- Run this in wrangler d1 execute

INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'aggressive momentum trader, buy tokens pumping 50%+, take profit at 100%, stop loss 25%', '{}', 'Test Bot 1');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'conservative momentum, only buy 20%+ gains, take profit 30%, tight 10% stop loss', '{}', 'Test Bot 2');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'momentum scalper, quick 15% profit targets, 8% stop loss, max 5 positions', '{}', 'Test Bot 3');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'trending token hunter, buy strong uptrends, 40% profit target, 15% stop', '{}', 'Test Bot 4');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'breakout trader, buy high momentum tokens, 60% target, 20% stop', '{}', 'Test Bot 5');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'pump chaser, aggressive 100%+ targets, 30% stop loss, 2 positions max', '{}', 'Test Bot 6');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'steady momentum, 25% target, 12% stop, diversified 4 positions', '{}', 'Test Bot 7');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'volatile momentum, 200% targets, 40% stop, single position focus', '{}', 'Test Bot 8');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'moderate momentum, 35% profit, 15% stop, balanced risk', '{}', 'Test Bot 9');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'momentum swing, 50% target, 18% stop, hold for trends', '{}', 'Test Bot 10');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'volume spike hunter, buy unusual volume, 30% profit, 15% stop', '{}', 'Test Bot 11');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'high volume scalper, quick volume plays, 20% target, 10% stop', '{}', 'Test Bot 12');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'volume breakout trader, 50% target on volume spikes, 20% stop', '{}', 'Test Bot 13');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'aggressive volume trader, 80% targets, 25% stop loss', '{}', 'Test Bot 14');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'conservative volume, 25% profit on high volume, 12% stop', '{}', 'Test Bot 15');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'volume momentum combo, 40% target, 18% stop', '{}', 'Test Bot 16');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'quick volume flip, 15% target, 8% stop, 5 positions', '{}', 'Test Bot 17');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'volume surge trader, 60% profit target, 22% stop', '{}', 'Test Bot 18');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'patient volume trader, 35% target, 15% stop', '{}', 'Test Bot 19');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'volume whale watcher, 100% targets, 30% stop', '{}', 'Test Bot 20');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'new launch sniper, buy tokens under 10 mins old, 50% target, 20% stop', '{}', 'Test Bot 21');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'ultra-early launcher, 5 min age max, 100% profit target, 30% stop', '{}', 'Test Bot 22');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'fresh token hunter, 30 min max age, 40% target, 15% stop', '{}', 'Test Bot 23');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'launch day trader, 1 hour max, 35% profit, 18% stop', '{}', 'Test Bot 24');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'brand new only, under 15 mins, 80% target, 25% stop', '{}', 'Test Bot 25');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'quick launch flip, 20 min max age, 25% target, 12% stop', '{}', 'Test Bot 26');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'new token scalper, 45 min max, 30% profit, 15% stop', '{}', 'Test Bot 27');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'fresh launch aggressive, 10 min max, 150% target, 35% stop', '{}', 'Test Bot 28');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'early bird trader, 25 min max age, 45% target, 20% stop', '{}', 'Test Bot 29');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'launch momentum, 40 min max, 55% profit, 22% stop', '{}', 'Test Bot 30');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'social buzz trader, follow trending tokens, 40% target, 18% stop', '{}', 'Test Bot 31');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'community hype hunter, buy social momentum, 60% profit, 25% stop', '{}', 'Test Bot 32');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'trending token trader, social signals, 35% target, 15% stop', '{}', 'Test Bot 33');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'viral token hunter, high social buzz, 80% profit, 28% stop', '{}', 'Test Bot 34');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'twitter trend follower, 50% target, 20% stop', '{}', 'Test Bot 35');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'community driven trader, 45% profit, 19% stop', '{}', 'Test Bot 36');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'social media scalper, 25% quick targets, 12% stop', '{}', 'Test Bot 37');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'hype cycle trader, 100% targets on buzz, 30% stop', '{}', 'Test Bot 38');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'social sentiment trader, 38% profit, 16% stop', '{}', 'Test Bot 39');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'buzz momentum combo, 55% target, 23% stop', '{}', 'Test Bot 40');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'balanced trader, momentum + volume, 35% profit, 15% stop', '{}', 'Test Bot 41');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'diversified bot, 5 positions, 30% targets, 14% stop', '{}', 'Test Bot 42');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'conservative all-around, 20% profit, 10% stop, safe plays', '{}', 'Test Bot 43');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'aggressive multi-signal, 120% targets, 32% stop', '{}', 'Test Bot 44');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'medium risk trader, 40% profit, 17% stop, 3 positions', '{}', 'Test Bot 45');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'swing trader, hold 2 hours max, 45% target, 20% stop', '{}', 'Test Bot 46');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'day trader, 30 min positions, 25% profit, 11% stop', '{}', 'Test Bot 47');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'patient investor, 4 hour holds, 60% profit, 24% stop', '{}', 'Test Bot 48');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'scalp master, 5 positions, 18% quick profits, 9% stop', '{}', 'Test Bot 49');
INSERT INTO bots (owner_address, match_id, prompt, prompt_dsl, bot_name) VALUES ('0x3587e9fe0a1e0ba8a3c6bcfb0d7d5870c08b2c1d', 3, 'whale watcher, follow big moves, 70% target, 26% stop', '{}', 'Test Bot 50');

-- Total: 50 bots created
