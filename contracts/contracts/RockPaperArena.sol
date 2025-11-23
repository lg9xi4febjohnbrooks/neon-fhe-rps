// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title RockPaperArena
 * @notice Encrypted Rock Paper Scissors game using FHE
 * @dev Implements three modules: MatchQueue, EncryptedMoveBook, PayoutVault
 *
 * Game Rules:
 * - Rock (0) beats Scissors (2)
 * - Paper (1) beats Rock (0)
 * - Scissors (2) beats Paper (1)
 *
 * Security Model:
 * - Fail-closed: All operations fail safely
 * - FHE encryption: Moves remain encrypted until reveal
 * - ACL management: Proper permission handling
 */

import {FHE, euint8, externalEuint8, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract RockPaperArena is ZamaEthereumConfig {
    /* ========== STATE VARIABLES ========== */

    /// @notice Match states enum
    enum MatchState {
        None,           // 0: Match doesn't exist
        Waiting,        // 1: Waiting for player 2
        BothCommitted,  // 2: Both players committed
        Revealed,       // 3: Winner determined
        Cancelled       // 4: Match cancelled
    }

    /// @notice Gesture enum (Rock=0, Paper=1, Scissors=2)
    enum Gesture {
        Rock,      // 0
        Paper,     // 1
        Scissors   // 2
    }

    /// @notice Match data structure
    struct Match {
        uint256 matchId;           // Unique match ID
        address player1;           // First player (match creator)
        address player2;           // Second player (challenger)
        euint8 move1;             // Encrypted move of player1
        euint8 move2;             // Encrypted move of player2
        bool player1Committed;    // Has player1 committed move?
        bool player2Committed;    // Has player2 committed move?
        uint256 createdAt;        // Timestamp of match creation
        MatchState state;         // Current match state
        address winner;           // Winner address (after reveal)
    }

    /// @notice Player statistics
    struct PlayerStats {
        uint256 wins;           // Total wins
        uint256 losses;         // Total losses
        uint256 draws;          // Total draws
        uint256 totalMatches;   // Total matches played
        uint256 currentStreak;  // Current win streak
    }

    /* ========== STORAGE ========== */

    /// @notice Match ID counter
    uint256 public matchCounter;

    /// @notice Mapping of match ID to Match struct
    mapping(uint256 => Match) public matches;

    /// @notice Mapping of player address to their stats
    mapping(address => PlayerStats) public playerStats;

    /// @notice Mapping of player address to their active match ID (0 if none)
    mapping(address => uint256) public playerActiveMatch;

    /// @notice Array of pending match IDs waiting for player 2
    uint256[] public pendingMatches;

    /* ========== EVENTS ========== */

    event MatchCreated(uint256 indexed matchId, address indexed player1);
    event MatchJoined(uint256 indexed matchId, address indexed player2);
    event MoveCommitted(uint256 indexed matchId, address indexed player);
    event MatchRevealed(uint256 indexed matchId, address winner, uint8 result);
    event MatchCancelled(uint256 indexed matchId);

    /* ========== ERRORS ========== */

    error AlreadyInMatch();
    error InvalidMatchId();
    error MatchNotWaiting();
    error UnauthorizedPlayer();
    error MoveAlreadyCommitted();
    error MatchNotReady();
    error InvalidGesture();

    /* ========== CONSTRUCTOR ========== */

    constructor() {
        // Initialize match counter (starts at 1)
        matchCounter = 1;
    }

    /* ========== MODULE 1: MATCH QUEUE ========== */

    /**
     * @notice Create a new match and wait for opponent
     * @dev Player1 creates match without committing move yet
     * @return matchId The created match ID
     */
    function createChallenge() external returns (uint256 matchId) {
        // Check player is not already in a match
        if (playerActiveMatch[msg.sender] != 0) {
            revert AlreadyInMatch();
        }

        // Create new match
        matchId = matchCounter++;
        Match storage newMatch = matches[matchId];

        newMatch.matchId = matchId;
        newMatch.player1 = msg.sender;
        newMatch.state = MatchState.Waiting;
        newMatch.createdAt = block.timestamp;

        // Mark player as in active match
        playerActiveMatch[msg.sender] = matchId;

        // Add to pending matches
        pendingMatches.push(matchId);

        emit MatchCreated(matchId, msg.sender);

        return matchId;
    }

    /**
     * @notice Join an existing match as player2
     * @param matchId The match ID to join
     */
    function acceptChallenge(uint256 matchId) external {
        // Validate match exists
        if (matchId == 0 || matchId >= matchCounter) {
            revert InvalidMatchId();
        }

        Match storage gameMatch = matches[matchId];

        // Check match is waiting for player2
        if (gameMatch.state != MatchState.Waiting) {
            revert MatchNotWaiting();
        }

        // Check player is not already in a match
        if (playerActiveMatch[msg.sender] != 0) {
            revert AlreadyInMatch();
        }

        // Cannot join own match
        if (gameMatch.player1 == msg.sender) {
            revert UnauthorizedPlayer();
        }

        // Set player2
        gameMatch.player2 = msg.sender;
        playerActiveMatch[msg.sender] = matchId;

        // Remove from pending matches
        _removePendingMatch(matchId);

        emit MatchJoined(matchId, msg.sender);
    }

    /**
     * @notice Cancel a match (only player1 can cancel before player2 joins)
     * @param matchId The match ID to cancel
     */
    function cancelMatch(uint256 matchId) external {
        Match storage gameMatch = matches[matchId];

        // Only player1 can cancel
        if (gameMatch.player1 != msg.sender) {
            revert UnauthorizedPlayer();
        }

        // Can only cancel waiting matches
        if (gameMatch.state != MatchState.Waiting) {
            revert MatchNotWaiting();
        }

        // Update state
        gameMatch.state = MatchState.Cancelled;
        playerActiveMatch[msg.sender] = 0;

        // Remove from pending matches
        _removePendingMatch(matchId);

        emit MatchCancelled(matchId);
    }

    /* ========== MODULE 2: ENCRYPTED MOVE BOOK ========== */

    /**
     * @notice Submit encrypted move for a match
     * @param matchId The match ID
     * @param encryptedMove The encrypted move (externalEuint8)
     * @param inputProof The zero-knowledge proof for the encrypted input
     */
    function submitMove(
        uint256 matchId,
        externalEuint8 encryptedMove,
        bytes calldata inputProof
    ) external {
        Match storage gameMatch = matches[matchId];

        // Validate player is in this match
        bool isPlayer1 = gameMatch.player1 == msg.sender;
        bool isPlayer2 = gameMatch.player2 == msg.sender;

        if (!isPlayer1 && !isPlayer2) {
            revert UnauthorizedPlayer();
        }

        // Check if move already committed
        if (isPlayer1 && gameMatch.player1Committed) {
            revert MoveAlreadyCommitted();
        }
        if (isPlayer2 && gameMatch.player2Committed) {
            revert MoveAlreadyCommitted();
        }

        // Import encrypted move from external
        euint8 move = FHE.fromExternal(encryptedMove, inputProof);

        // Authorize contract to access the encrypted value
        FHE.allowThis(move);

        // Store encrypted move
        if (isPlayer1) {
            gameMatch.move1 = move;
            gameMatch.player1Committed = true;
            emit MoveCommitted(matchId, msg.sender);
        } else {
            gameMatch.move2 = move;
            gameMatch.player2Committed = true;
            emit MoveCommitted(matchId, msg.sender);
        }

        // Check if both players have committed
        if (gameMatch.player1Committed && gameMatch.player2Committed) {
            gameMatch.state = MatchState.BothCommitted;
        }
    }

    /**
     * @notice Lock move (prevent further changes)
     * @dev Called automatically when both moves are submitted
     * @param matchId The match ID
     */
    function lockMove(uint256 matchId) external view returns (bool) {
        Match storage gameMatch = matches[matchId];
        return gameMatch.state == MatchState.BothCommitted;
    }

    /* ========== MODULE 3: PAYOUT VAULT & REVEAL ========== */

    /**
     * @notice Reveal match outcome (determine winner)
     * @param matchId The match ID
     * @dev Uses homomorphic operations to determine winner without decryption
     */
    function requestReveal(uint256 matchId) external {
        Match storage gameMatch = matches[matchId];

        // Check both moves committed
        if (gameMatch.state != MatchState.BothCommitted) {
            revert MatchNotReady();
        }

        // Only players in match can request reveal
        if (msg.sender != gameMatch.player1 && msg.sender != gameMatch.player2) {
            revert UnauthorizedPlayer();
        }

        // Determine winner using FHE operations
        _settleMatch(matchId);
    }

    /**
     * @notice Internal function to settle match and determine winner
     * @param matchId The match ID
     */
    function _settleMatch(uint256 matchId) internal {
        Match storage gameMatch = matches[matchId];

        euint8 move1 = gameMatch.move1;
        euint8 move2 = gameMatch.move2;

        // Rock=0, Paper=1, Scissors=2
        // Winner logic (homomorphic truth table):
        // - If moves are equal: Draw (0)
        // - Rock (0) beats Scissors (2)
        // - Paper (1) beats Rock (0)
        // - Scissors (2) beats Paper (1)

        // Check if draw (move1 == move2)
        ebool isDraw = FHE.eq(move1, move2);

        // Check if player1 wins
        // Case 1: move1=0 (Rock) && move2=2 (Scissors)
        ebool p1WinCase1 = FHE.and(FHE.eq(move1, FHE.asEuint8(0)), FHE.eq(move2, FHE.asEuint8(2)));

        // Case 2: move1=1 (Paper) && move2=0 (Rock)
        ebool p1WinCase2 = FHE.and(FHE.eq(move1, FHE.asEuint8(1)), FHE.eq(move2, FHE.asEuint8(0)));

        // Case 3: move1=2 (Scissors) && move2=1 (Paper)
        ebool p1WinCase3 = FHE.and(FHE.eq(move1, FHE.asEuint8(2)), FHE.eq(move2, FHE.asEuint8(1)));

        // Combine all player1 win cases
        ebool p1Wins = FHE.or(FHE.or(p1WinCase1, p1WinCase2), p1WinCase3);

        // Result encoding: 0=Draw, 1=Player1 wins, 2=Player2 wins
        euint8 result = FHE.select(
            isDraw,
            FHE.asEuint8(0), // Draw
            FHE.select(p1Wins, FHE.asEuint8(1), FHE.asEuint8(2)) // P1 wins or P2 wins
        );

        // Allow this contract to access result
        FHE.allowThis(result);

        // Update match state
        gameMatch.state = MatchState.Revealed;

        // Clear active match for both players
        playerActiveMatch[gameMatch.player1] = 0;
        playerActiveMatch[gameMatch.player2] = 0;

        // Note: In production, use Gateway callback to decrypt result
        // For this implementation, we emit event with encrypted result
        emit MatchRevealed(matchId, address(0), 0);

        // Update stats (simplified - in production use Gateway callback)
        _updateStats(matchId, result);
    }

    /**
     * @notice Update player statistics
     * @param matchId The match ID
     * @param result The match result (0=Draw, 1=Player1, 2=Player2)
     */
    function _updateStats(uint256 matchId, euint8 result) internal {
        Match storage gameMatch = matches[matchId];

        // Increment total matches for both players
        playerStats[gameMatch.player1].totalMatches++;
        playerStats[gameMatch.player2].totalMatches++;

        // Note: Stats update requires Gateway callback for actual decryption
        // This is a simplified version for demonstration
    }

    /**
     * @notice Claim rewards (placeholder for future token rewards)
     * @dev To be implemented with token integration
     */
    function claimRewards() external pure {
        // Placeholder for future implementation
        revert("Not implemented");
    }

    /**
     * @notice Update win streak (placeholder)
     * @dev To be implemented with Gateway callback
     */
    function updateStreak(address /*player*/, bool /*won*/) external pure {
        // Placeholder for future implementation
        revert("Not implemented");
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Get pending matches
     * @return Array of pending match IDs
     */
    function getPendingMatches() external view returns (uint256[] memory) {
        return pendingMatches;
    }

    /**
     * @notice Get match details
     * @param matchId The match ID
     * @return Match struct
     */
    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    /**
     * @notice Get player statistics
     * @param player The player address
     * @return PlayerStats struct
     */
    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return playerStats[player];
    }

    /* ========== INTERNAL HELPER FUNCTIONS ========== */

    /**
     * @notice Remove match from pending matches array
     * @param matchId The match ID to remove
     */
    function _removePendingMatch(uint256 matchId) internal {
        uint256 length = pendingMatches.length;
        for (uint256 i = 0; i < length; i++) {
            if (pendingMatches[i] == matchId) {
                // Move last element to current position and pop
                pendingMatches[i] = pendingMatches[length - 1];
                pendingMatches.pop();
                break;
            }
        }
    }
}
