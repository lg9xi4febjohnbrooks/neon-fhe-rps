# RockPaperFHE Backend Development Guide

        ## Contract System
        ### MatchQueue
Pairs challengers, stores encrypted stake requirements, and tracks matchmaking windows.

- **FHE Logic**: Encrypted stake thresholds compared with `TFHE.ge` before match creation.
- **Key Functions**: `createChallenge`, `acceptChallenge`, `cancelMatch`

### EncryptedMoveBook
Stores encrypted move commitments and prevents reveal-before-commit scenarios.

- **FHE Logic**: Homomorphic truth table checks allocate win/draw outcomes once both moves submitted.
- **Key Functions**: `submitMove`, `lockMove`, `requestReveal`

### PayoutVault
Manages prize pool distribution, streak tracking, and leaderboard events.

- **FHE Logic**: Gateway decrypt identifies winner, then encrypted pot splits are released to cleartext payouts.
- **Key Functions**: `settleMatch`, `claimRewards`, `updateStreak`

        ## Storage Layout
        - `mapping(uint256 => MatchState)` with encrypted stake, timeout, and participants.
- `mapping(uint256 => MoveEnvelope)` capturing encrypted move, salt hash, and commit timestamp.
- `mapping(address => PlayerStats)` storing encrypted win streak counters and reward balances.

        ## Gateway & Relayer Coordination
        - Gateway verifies both moves committed before decrypting outcome.
- Reveal payload includes outcome signature and updated streak metadata.
- Timeout watchdog triggers auto-refunds if opponent never reveals.

        ## Offchain Services
        - Leaderboard API delivering anonymised rankings and streak heatmaps.
- Webhook integration for Discord bots announcing tournament winners.
- Match replay generator turning reveals into shareable GIFs.

        ## Testing Strategy
        - Hardhat tests verifying game logic, timeout refunds, and streak tracking.
- Fuzz testing ensures encrypted outcome mapping matches rock-paper-scissors table.
- Gateway mocks covering simultaneous reveal requests and retries.

        ## Deployment Playbook
        - Deploy `RockPaperArena.sol` with upgradeable proxy and guardian roles for tournament settings.
- Enable cron job to clean stale matches and refund stakes automatically.
- Vercel deploy integrated with websockets for live match updates.
