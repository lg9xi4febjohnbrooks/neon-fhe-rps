# RockPaperFHE - Encrypted Rock-Paper-Scissors Arena


## Vision
RockPaperFHE brings the classic game on-chain with instant matches and encrypted move commitments.
Players stake tokens, submit encrypted moves, and reveals occur only after both sides commit,
preventing front-running and preserving suspense.


## Market Fit & Sustainability
- Casual gaming communities wanting provably fair mini-games.
- Esports guilds running fast tournaments with token rewards.
- Education programs demonstrating FHE concepts through familiar gameplay.


## FHE-First Architecture
- Moves represented as `euint8` and compared via homomorphic truth tables to determine winners.
- Encrypted stakes aggregated with `TFHE.add` for prize pool growth without leaking pot size mid-match.
- Gateway reveal only after both players lock in to avoid strategy leakage.


## Token & Revenue Model
- Take rake on ranked matches and share with guild partners.
- Offer branded arenas as sponsorship opportunities.
- Sell tournament passes and cosmetic NFTs tied to encrypted win streaks.


## Contract Modules
- **MatchQueue** — Pairs challengers, stores encrypted stake requirements, and tracks matchmaking windows. Encrypted stake thresholds compared with `TFHE.ge` before match creation.
  - Functions: `createChallenge`, `acceptChallenge`, `cancelMatch`
- **EncryptedMoveBook** — Stores encrypted move commitments and prevents reveal-before-commit scenarios. Homomorphic truth table checks allocate win/draw outcomes once both moves submitted.
  - Functions: `submitMove`, `lockMove`, `requestReveal`
- **PayoutVault** — Manages prize pool distribution, streak tracking, and leaderboard events. Gateway decrypt identifies winner, then encrypted pot splits are released to cleartext payouts.
  - Functions: `settleMatch`, `claimRewards`, `updateStreak`


## Frontend Experience
- **Theme**: Arcade Neon • Primary #F97316 • Accent #10B981
- **Font Pairing**: Montserrat Alternates + Press Start 2P
- **Realtime UX**: Socket.IO streams opponent status, reveal announcements, and leaderboard updates in real time.


## Deployment & Operations
- Deploy `RockPaperArena.sol` with upgradeable proxy and guardian roles for tournament settings.
- Enable cron job to clean stale matches and refund stakes automatically.
- Vercel deploy integrated with websockets for live match updates.


## Roadmap
- Add team modes and multi-round tournaments with encrypted series scoring.
- Introduce NFT avatars that evolve with encrypted streak achievements.
- Launch mobile-optimised PWA for casual gaming growth.


## Partnership Targets
- Web3 gaming guilds seeking provably fair micro games.
- Education programs teaching cryptography via interactive demos.
- Streamers wanting audience participation events.
