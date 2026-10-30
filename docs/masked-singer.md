# The Masked Singer · Bella

Each account has one free opening; subsequent openings cost 15 coins. The server chooses one prize and atomically debits the wallet and grants ownership. Three client-side taps peel off three foil sections; taps never choose or change the reward.

Disjoint pools: 20% headline singers (Dangrangto, Jack97, MCK, The Weeknd, Sơn Tùng MTP; 4% each); 30% purchasable skins priced above 6 through 10 coins; 50% purchasable skins priced above 0 through 6 coins. Event-only GOAT/BOAT skins and free skins are excluded. Groups and displayed odds share `public/masked-catalog.js`.

The free opening and one-time gift notice are server-side account flags, defaulting to unused for legacy and new accounts. Claiming the notice is atomic across devices and does not consume the gift. The first new opening automatically uses the free gift; later requests cannot force another free opening.

A stable account-scoped request ID is retained until accepting the card. Reloads and retries resume the same opening without another debit. Duplicate skins cost the normal 15 coins and do not refund coins; this is disclosed before opening. Four new singers are Masked Singer exclusive; Son Hyung Min is available in the shop for 20 coins.

The foil artwork is generated for this event and stored at `public/assets/masked-packet.png`. Background spotlights, tearing segments and celebration particles are rendered by the event UI. The in-game full-effects preference also controls this event.
