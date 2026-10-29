# Accounts, skins and coins

Registration requires only username and password. Accounts start with 0 coins and the free `farmer` skin. Usernames are case insensitive. Account profiles and skin ownership persist in Redis without the room's seven-day expiry. Sessions last 30 days and use a random token in an HttpOnly, SameSite=Strict cookie (Secure on HTTPS). Logout revokes the session server-side. Room tokens additionally require the matching account identity.

Passwords use a random salt and asynchronous Node scrypt with N=131072, r=8, p=1. Hashes and session keys never enter public room snapshots. References: [Node crypto](https://nodejs.org/api/crypto.html), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Each successful password login grants one random 1–5 coin gift. Registration, restoring a session, refreshing the page, and failed login do not grant gifts. Repeating the same login request ID returns its previous grant. There is no daily gift restriction; logging out and logging in again with a fresh request grants another gift, as requested.

The champion of a tournament that started with at least one bot receives 1 coin. Refunds, individual hands, human-only tournaments and bot champions do not earn this prize. The server credits a receipt unique to the persisted room code and creation time; repeated or simultaneous result requests cannot grant twice. Account coin writes and skin purchases use Redis compare-and-swap to prevent duplicate spending.

Prices live in `public/characters.js`: farmer 0; the six original skins 1 each; Quỷ đỏ 6; Chần đè, Lê bống and Goat CR7 5 each; Djokovic and Steve Dóp 4 each; Iron Man and Captain America 5 each. These two original costumes use separate missile and shield animations. Web animation is prepared for a future approved third skin. Already-owned skins cost nothing to equip. Browser unlock lists and the former group-message confirmation cannot grant ownership.

The farmer artwork was created with the built-in image_gen tool and stored as `public/assets/characters/farmer.webp`. Its source prompt is saved alongside these docs.
