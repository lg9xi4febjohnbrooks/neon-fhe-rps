# RockPaperFHE Frontend Development Guide

        ## Identity & Theme
        - **Design Language**: Arcade Neon — primary #F97316, secondary #111827, accent #10B981, surface #1F2937, background #020617.
        - **Gradient Token**: linear-gradient(135deg, #F97316 0%, #6366F1 100%)
        - **Font Pairing**: Montserrat Alternates + Press Start 2P

        ## Core Pages & Flows
        ### Route `/` — Arcade Lobby
                **Purpose**: Show match queues, current tournaments, and quick start actions.
                - Hero scoreboard cycling through recent winners with encrypted streak badges.
- Queue cards showing estimated wait time and stake level.
- CTA row for 'Start Match', 'Join Tournament', and 'View Leaderboard'.

### Route `/match/[id]` — Match Console
                **Purpose**: Encrypt moves, watch opponent progress, and monitor reveal timeline.
                - Move selector with gesture icons and encryption confirmation panel.
- Timeline showing commit, opponent commit, reveal, and payout states.
- Chat/emote lane for banter using safe predefined reactions.

### Route `/leaderboard` — Leaderboard & History
                **Purpose**: Review streaks, match history, and share achievements.
                - Animated ranking cards with encrypted win ratios displayed as percentages.
- Filters for time frame, stake tier, and guild.
- Match log table linking to replay highlights.

        ## Signature Components
        - **MoveSelector** — Icon-based input with encryption progress feedback.
- **MatchTimeline** — Stepper illustrating commit/reveal/payout lifecycle.
- **StreakBadge** — Animated badge reflecting encrypted streak length once revealed.

        ## State & Data
        - React Query handles match state; Zustand stores current move; websockets push opponent commits.
        - Smart contract data hydrated via wagmi `readContract` hooks with suspense wrappers.
        - Encryption context stored in React Context to avoid re-initialising the SDK per component.

        ## Encryption Workflow
        Initialise SDK, encode move as small int, call `encryptUint8`, submit with hashed salt.

        ## Realtime & Telemetry
        - Socket.IO streams opponent status, reveal announcements, and leaderboard updates in real time.
        - Analytics via PostHog tracking conversion funnels and retention cohorts.
        - Error logging with Sentry capturing encryption or gateway issues.

        ## Testing & Quality
        - Playwright ensures commit/reveal flow works under varied latency.
        - Unit tests for timeline component reacting to websocket events.
        - Visual regression tests keeping neon palette consistent.
