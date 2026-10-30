# CR7 B.O.A.T event v1

One free opening per account, then 20 virtual coins per opening. Both have 30% combined CR7 chance (7.5% each) and 70% combined ordinary tier chance (8.75% each of eight 3-coin skins). Existing ownership does not change the odds; duplicate outcomes do not refund coins. Event skins cannot be bought directly or obtained from the standard mystery pack.

Account CAS atomically saves debit, free-use flag, ownership, and a request receipt including before/after balances. Client stores an unresolved receipt to retry the same draw after timeout/reload. Explicit free/paid mode prevents a duplicate free request silently becoming a paid draw. Popup is shown once per event/account; entry remains in toolbar/shop. Reward viewer shows live effects and odds before opening. Server selects the result; cycling four skins is presentation only.

Original poster and concepts: ../bella-cr7-boat-designs (outside repository). Built-in imagegen removed baked effects from each character with prompt: “Keep mascot, face angle, pose and uniform unchanged; remove surrounding rings, particles, floating balls and trophy; genuine transparent background.” Clean WebP character layers and optimized poster are in public/assets/events/cr7-boat. SVG/CSS adds independent rings, spinning footballs/stars, trophy, sparks and pulsing aura, honoring reduced motion.
