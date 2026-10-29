# Admin control room

Open `/admin.html` with the game's existing HttpOnly account session. Only accounts with the server-owned `role: "admin"` field can call any admin API. Registration/login payloads cannot assign roles. There is deliberately no public role-grant endpoint. The owner bootstrap is a separate local operation for the user-authorized account `ducduy.191@gmail.com`.

Features: newest-first account directory, exact normalized username lookup, 30-row pagination, account creation timestamps, owned character/card skins, signed coin adjustments, gifts from either catalog, per-account/global operation history. Existing accounts are indexed via bounded Redis SCAN batches on admin-page load or manual sync; new registrations update the index. Credentials, salts, password hashes, session tokens, account keys and claims are never returned in admin responses.

Changes require a 3–300 character reason and a unique request ID. The confirmation shows the target and expected before/after values; the server validates the actual balance, rejects fractional/zero/unsafe adjustments and overdrafts, and increments the account version. Redis Lua commits the account, immutable audit record and both audit indexes atomically. Retrying the same request cannot double-apply a change; reusing its ID with a different payload returns 409. Gifts never deduct coins, cannot duplicate ownership, and record already-owned gifts explicitly. Logs include actor, target, timestamp, reason, before/after balances and skin metadata. They cannot be edited/deleted through this UI/API.

History starts when this feature is deployed; earlier manual coin changes are not invented or backfilled. Account/skin purchasing and game logic continue to use the same account records and CAS version checks.
