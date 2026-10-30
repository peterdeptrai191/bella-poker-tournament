# Bella Sâm lốc

Sâm runs independently at `/sam`, API `/api/sam`, Redis records `sam-room:<code>` (7 day TTL). It does not use Poker room records, the Poker action engine, or card-peek scripts. Same account cookie, character catalog/ownership, card skin shop and music preferences as Poker.

## Flow

Home carousel has exactly two cards: Sâm first (play now), Fishing second (existing password-gated alpha). Create or join a 6-character room; 2–5 players; everyone ready; host starts. Bots can fill empty seats. Room invitation links use `/sam?room=CODE`. Recent room can be resumed on the same device. Host can return the whole room to ready-up for the next round. Leaving a waiting room removes membership; navigating out during a hand preserves the seat and the 25-second turn timer handles absence.

## House rules shown in-game

52 cards, ten each, no suit tiebreak. Rank 3–A–2; singles, pairs, triples, quads, consecutive distinct-rank straights of 3+ cards excluding 2. Higher matching type/length beats lower; a quad cuts one 2 or a lower quad, not a pair of 2s. No paired runs or A–2–3 straights. Passing locks that seat out until the last successful player regains a clear table.

Eight-second declaration window: first player to declare Sâm leads. If blocked, the blocker wins immediately; otherwise the declarer must empty their hand without being blocked. In ordinary play the prior winner leads, first round is random. Auto Báo 1; the seat immediately before a one-card player must lead/respond with their highest single if choosing to play a single. Finishing with 2 is prohibited; an unavoidable last-2 situation is resolved as a loss on timeout.

Instant wins priority: 10-card straight, four 2s, all one color, three triples, five pairs; ties use room seat order. Losers lose remaining-card points +10 for having all ten cards +5 per remaining 2; winner gets total. This is a documented Bella variant; no real money stakes or coin deductions.

Winner reward follows existing Bella policy: all-human room 1 coin per entrant; mixed bot room 1 coin to a human winner. A bot winner gets zero. The account update and audit event commit atomically via `writeAdminChange`, deduplicated by round UUID. Retrying requests/polls cannot pay twice. Audit records include numeric before/after balances and room/round reason. Unchanged fractional Fishing remainder is preserved.

## Privacy and synchronization

Account authentication and room membership checked on every request. Only own cards are returned while a hand is active; all hands revealed after finish. No account keys, account IDs, opponent hands, or deck in public snapshots. Selection and rules validated on server. CAS room writes, request receipts, round IDs, host checks, owned-skin checks and bounded request size. Poll 1.5s active / 2.5s waiting, paused when hidden; bot/timeouts advance on room requests. This uses existing serverless/Redis polling rather than WebSockets.

## Banner asset

`public/sam/entry-bella.webp`, generated with built-in image generation, converted to WebP without composition edits. Prompt: Bella yellow-orange flame mascot playing Vietnamese Sâm at an emerald felt table, navy outlines, white gloves, elegant emerald/gold waistcoat, holding ten cards and playing a pair; dark green negative space on left for HTML title, subject on right; warm brass lamps, walnut lounge, subtle gold sparks, polished premium cartoon game art, wide 2:1; no text, watermark or UI. Farmer character asset supplied as Bella identity reference.

## Validation

`node --test test/*.test.js`, includes `test/sam.test.js` for combinations, suit ties, chopping, instant wins, dealing/privacy, pass reset, turn/ownership/duplicate selection, Báo 1, Sâm capture, simulated bot games, membership, receipt deduplication and audited once-only rewards. Local UI checked with disposable in-memory accounts. Never load production Redis env for local tests.
