# Bella Fishing — private alpha

Entry: gray **BELLA FISHING / COMING SOON** tile in the authenticated Poker home. A server-validated passphrase unlocks an HttpOnly session-bound 8-hour cookie. Default alpha code: `1901`; override with `FISHING_ALPHA_PASS`. This is a shared preview code, not an admin role. The static UI is public, but every Fishing data/game API requires both account authentication and the alpha cookie. Direct `/fishing` entry prompts for the code.

## Isolation

- New page: `/fishing`, assets/code/CSS under `/public/fishing`.
- New API: `/api/fishing.js`; service under `/lib/fishing`.
- Progress, inventory, receipts and equipment in `account.fishing`; room namespace `fishing-room:*`, separate from Poker rooms/timers/decks.
- Shared account ID, display name, owned skins and wallet. Fishing equipment/skin selection does not change Poker equipment. Only owned skins may be equipped. Uses the current complete character catalog including GOAT/M10/Neymar.
- Main Poker changes are the small home entry mount. Local server/Vercel config add only the new API and page route. Shared music gets an optional cross-page playback checkpoint; existing mute/volume preferences remain authoritative.

## Economy and transactions

1 coin = 1000 milli-coins. `account.coins` stays a non-negative safe integer for existing Poker/shop/admin code. `fishing.remainder` stores 0–999 milli-coins. Fishing debits/credits normalize the total back into these two fields inside the same account CAS. Example: 2 coins − 0.100 becomes 1 whole coin + 0.900 remainder. Shop spending/tournament rewards keep the remainder. An account asset reset clears stale remainder and active casts at next Fishing access.

All Fishing commands have receipts. A retry with the same ID returns the prior result; reuse with different payload is rejected. Account state and audit (before/after total coin balance, reason, actor, result) commit atomically with existing admin audit storage. Recent personal history is also retained. No client-reported payout or `caught: true` is trusted.

## Implemented rules

- 120 species, 15 per lake, 8 lakes; 50/30/15/4/1% tier odds.
- Lake fees .100/.200/.300/.400/.500/.600/.800/1.000; sale multipliers .65/1/2/5/15. Size is a record, not a sale multiplier.
- Ten free training casts; training fish are not stored/sold or credited to collection/XP. Completion awards 2 coin once. Abandoning/missing counts as a completed training attempt.
- Daily rescue vouchers: 2/day, cap 6; Lotus Lake + ordinary bait only. Regular bait included, specialty bait +.010, targeted bait +.020. Baits change species preferences, never rarity odds; targeted species must already be discovered and have siblings in its tier.
- One active cast/account. Server chooses hidden species/size. Bite and hook deadlines are authoritative. A 100ms deterministic simulation uses the equipped gear and server seed; finish requests replay timestamped hold/release transitions and enforce real elapsed time. Late hooks, invalid logs, fast-forwarded results and double sales are rejected.
- Persistent bag, sale, release, favorites lock, optional common auto-sale, collection and size records, XP, lake unlocks, rods/reels/lines/hooks/floats and sequential bag upgrades.
- Collection milestones per lake: 5 species +.300, 10 +.700, 15 +2.000 coin, once each. Daily missions pay .100/.100/.300; weekly 100 catches pays 2.000. Vietnam day boundaries; weeks start Monday.
- Online private rooms up to four authenticated, alpha-unlocked players. Every player must own lake access. Slots stable, presence expires after 90s, 10s visible-tab polling. Fishing remains individual per account. Shared emotes and visible casting/pulling states. Rooms survive host leaving, expire after a day of inactivity.
- Shared jazz music, remembered volume/mute, playback-position checkpoint across pages, in-game music controls and gesture fallback for autoplay restrictions.

## Visual scope

Environment, platform, character/effect, rod/reel, line, float and nameplate are separate layers. Existing 2D skin art is reused with existing animated effects; full skeletal sitting/fishing poses are not created in this alpha. Eight lakes reuse one environment with different grading; fish art varies by rarity, not 120 unique species illustrations. Spectator competition, aquariums, advanced visual variants and new collection-reward character assets are not included yet. These limits are visible under in-game rules.

## Artwork

`public/fishing/assets/entry.webp`: built-in imagegen, using farmer skin as identity reference. Prompt: “Premium landscape 16:9 illustrated game tile; cheerful flame Bella in straw hat and brown farmer clothes seated on a wooden pier on right, fishing over emerald water at golden sunrise; left third calm dark teal water for HTML copy; lotus, basket, misty hills, strong 3D volume, private-club emerald/navy/gold; no text/UI/logo.” Generated original preserved outside repository under `../bella-fishing-artwork/entry-original.png`.

`lake.webp`: existing generated Figma AI blank lake environment, no embedded characters/tackle. Full prompt in local design source `../bella-fishing-v2/MODULAR-DEMO.md`. No runtime requests to Figma/image generation.

## Validation and rollback

Run `node --test test/fishing.test.js` for odds/catalog, authoritative results, exact wallet/idempotency/audit, unlock/ownership checks, session gate, room capacity and Poker compatibility. Run `npm test` for regression. Local QA uses memory storage with Redis env vars unset, never production data.

Rollback entry by removing the `mountFishingEntry` import/call from `public/app.js`. Existing Poker continues independently. Do not delete `account.fishing` without accounting for the fractional remainder. Disable/revoke the alpha with `FISHING_ALPHA_PASS` rotation.
