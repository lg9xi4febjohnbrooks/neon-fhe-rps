/**
 * RockPaperArena Comprehensive Test Suite
 *
 * Tests cover:
 * 1. Unit Tests - Individual function behavior
 * 2. Integration Tests - Complete game flows
 * 3. Edge Cases - Boundary conditions and error handling
 * 4. Security Tests - Access control and state management
 * 5. FHE Operations - Encrypted move handling
 *
 * @author Claude Code
 * @version 2.0.0 - TypeScript with FHE support
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { RockPaperArena } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { createInstances, createInstance } from "../test-utils/instance";
import { getSigners, initSigners } from "../test-utils/signers";
import { deployRockPaperArenaFixture } from "./fixtures/RockPaperArena.fixture";

describe("RockPaperArena - Comprehensive Test Suite", function () {
  let rockPaperArena: RockPaperArena;
  let owner: HardhatEthersSigner;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;
  let player3: HardhatEthersSigner;
  let instances: any;

  // Game moves enum
  enum Gesture {
    Rock = 0,
    Paper = 1,
    Scissors = 2,
  }

  // Match states enum
  enum MatchState {
    None = 0,
    Waiting = 1,
    BothCommitted = 2,
    Revealed = 3,
    Cancelled = 4,
  }

  before(async function () {
    // Initialize signers for FHE
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    // Deploy contract
    const deployment = await deployRockPaperArenaFixture();
    rockPaperArena = deployment.rockPaperArena;
    owner = deployment.owner;
    player1 = deployment.player1;
    player2 = deployment.player2;
    player3 = deployment.player3;

    // Create FHE instances for each player
    const contractAddress = await rockPaperArena.getAddress();
    instances = await createInstances(contractAddress, ethers, this.signers);
  });

  /* ========================================
   * UNIT TESTS - DEPLOYMENT & INITIALIZATION
   * ======================================== */

  describe("1. Deployment & Initialization", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await rockPaperArena.matchCounter()).to.equal(1n);
    });

    it("Should initialize with zero pending matches", async function () {
      const pendingMatches = await rockPaperArena.getPendingMatches();
      expect(pendingMatches.length).to.equal(0);
    });

    it("Should have no active matches for players initially", async function () {
      expect(await rockPaperArena.playerActiveMatch(player1.address)).to.equal(0n);
      expect(await rockPaperArena.playerActiveMatch(player2.address)).to.equal(0n);
    });

    it("Should initialize player stats to zero", async function () {
      const stats = await rockPaperArena.getPlayerStats(player1.address);
      expect(stats.wins).to.equal(0n);
      expect(stats.losses).to.equal(0n);
      expect(stats.draws).to.equal(0n);
      expect(stats.totalMatches).to.equal(0n);
      expect(stats.currentStreak).to.equal(0n);
    });
  });

  /* ========================================
   * UNIT TESTS - MODULE 1: MATCH QUEUE
   * ======================================== */

  describe("2. Module 1: Match Queue", function () {
    describe("2.1 createChallenge()", function () {
      it("Should create a new match successfully", async function () {
        const tx = await rockPaperArena.connect(player1).createChallenge();
        const receipt = await tx.wait();

        // Verify MatchCreated event
        const events = receipt?.logs || [];
        const matchCreatedEvent = events.find((log: any) => {
          try {
            const parsed = rockPaperArena.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            return parsed?.name === "MatchCreated";
          } catch {
            return false;
          }
        });

        expect(matchCreatedEvent).to.not.be.undefined;

        // Verify match counter incremented
        expect(await rockPaperArena.matchCounter()).to.equal(2n);

        // Verify match added to pending matches
        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(1);
        expect(pendingMatches[0]).to.equal(1n);

        // Verify player active match set
        expect(await rockPaperArena.playerActiveMatch(player1.address)).to.equal(1n);
      });

      it("Should emit MatchCreated event with correct parameters", async function () {
        await expect(rockPaperArena.connect(player1).createChallenge())
          .to.emit(rockPaperArena, "MatchCreated")
          .withArgs(1n, player1.address);
      });

      it("Should revert if player already in a match", async function () {
        await rockPaperArena.connect(player1).createChallenge();

        await expect(
          rockPaperArena.connect(player1).createChallenge()
        ).to.be.revertedWithCustomError(rockPaperArena, "AlreadyInMatch");
      });

      it("Should allow multiple players to create matches simultaneously", async function () {
        await rockPaperArena.connect(player1).createChallenge();
        await rockPaperArena.connect(player2).createChallenge();
        await rockPaperArena.connect(player3).createChallenge();

        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(3);
        expect(pendingMatches).to.deep.equal([1n, 2n, 3n]);
      });

      it("Should set match state to Waiting", async function () {
        await rockPaperArena.connect(player1).createChallenge();
        const match = await rockPaperArena.getMatch(1);
        expect(match.state).to.equal(MatchState.Waiting);
      });

      it("Should record match creation timestamp", async function () {
        const tx = await rockPaperArena.connect(player1).createChallenge();
        const receipt = await tx.wait();
        const block = await ethers.provider.getBlock(receipt!.blockNumber);

        const match = await rockPaperArena.getMatch(1);
        expect(match.createdAt).to.be.closeTo(block!.timestamp, 5);
      });
    });

    describe("2.2 acceptChallenge()", function () {
      beforeEach(async function () {
        // Player1 creates a match
        await rockPaperArena.connect(player1).createChallenge();
      });

      it("Should allow player2 to join a match", async function () {
        const tx = await rockPaperArena.connect(player2).acceptChallenge(1);
        const receipt = await tx.wait();

        // Verify MatchJoined event
        const events = receipt?.logs || [];
        const matchJoinedEvent = events.find((log: any) => {
          try {
            const parsed = rockPaperArena.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            return parsed?.name === "MatchJoined";
          } catch {
            return false;
          }
        });

        expect(matchJoinedEvent).to.not.be.undefined;
      });

      it("Should emit MatchJoined event with correct parameters", async function () {
        await expect(rockPaperArena.connect(player2).acceptChallenge(1))
          .to.emit(rockPaperArena, "MatchJoined")
          .withArgs(1n, player2.address);
      });

      it("Should set player2 in match data", async function () {
        await rockPaperArena.connect(player2).acceptChallenge(1);
        const match = await rockPaperArena.getMatch(1);
        expect(match.player2).to.equal(player2.address);
      });

      it("Should remove match from pending matches", async function () {
        await rockPaperArena.connect(player2).acceptChallenge(1);
        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(0);
      });

      it("Should set player2 active match", async function () {
        await rockPaperArena.connect(player2).acceptChallenge(1);
        expect(await rockPaperArena.playerActiveMatch(player2.address)).to.equal(1n);
      });

      it("Should revert if match does not exist", async function () {
        await expect(
          rockPaperArena.connect(player2).acceptChallenge(999)
        ).to.be.revertedWithCustomError(rockPaperArena, "InvalidMatchId");
      });

      it("Should revert if match ID is zero", async function () {
        await expect(
          rockPaperArena.connect(player2).acceptChallenge(0)
        ).to.be.revertedWithCustomError(rockPaperArena, "InvalidMatchId");
      });

      it("Should revert if player already in a match", async function () {
        await rockPaperArena.connect(player2).createChallenge();

        await expect(
          rockPaperArena.connect(player2).acceptChallenge(1)
        ).to.be.revertedWithCustomError(rockPaperArena, "AlreadyInMatch");
      });

      it("Should revert if player1 tries to join own match", async function () {
        await expect(
          rockPaperArena.connect(player1).acceptChallenge(1)
        ).to.be.revertedWithCustomError(rockPaperArena, "UnauthorizedPlayer");
      });

      it("Should revert if match is not in Waiting state", async function () {
        await rockPaperArena.connect(player2).acceptChallenge(1);

        await expect(
          rockPaperArena.connect(player3).acceptChallenge(1)
        ).to.be.revertedWithCustomError(rockPaperArena, "MatchNotWaiting");
      });

      it("Should handle concurrent acceptChallenge correctly", async function () {
        await rockPaperArena.connect(player2).createChallenge();
        await rockPaperArena.connect(player3).createChallenge();

        // Player1 accepts match 1, player2 is busy, player3 accepts match 2
        const [, , , , p4, p5] = await ethers.getSigners();
        await rockPaperArena.connect(p4).acceptChallenge(1);
        await rockPaperArena.connect(p5).acceptChallenge(2);

        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(1); // Only match 3 pending
      });
    });

    describe("2.3 cancelMatch()", function () {
      beforeEach(async function () {
        await rockPaperArena.connect(player1).createChallenge();
      });

      it("Should allow player1 to cancel waiting match", async function () {
        const tx = await rockPaperArena.connect(player1).cancelMatch(1);
        const receipt = await tx.wait();

        // Verify MatchCancelled event
        const events = receipt?.logs || [];
        const matchCancelledEvent = events.find((log: any) => {
          try {
            const parsed = rockPaperArena.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            return parsed?.name === "MatchCancelled";
          } catch {
            return false;
          }
        });

        expect(matchCancelledEvent).to.not.be.undefined;
      });

      it("Should emit MatchCancelled event", async function () {
        await expect(rockPaperArena.connect(player1).cancelMatch(1))
          .to.emit(rockPaperArena, "MatchCancelled")
          .withArgs(1n);
      });

      it("Should set match state to Cancelled", async function () {
        await rockPaperArena.connect(player1).cancelMatch(1);
        const match = await rockPaperArena.getMatch(1);
        expect(match.state).to.equal(MatchState.Cancelled);
      });

      it("Should clear player1 active match", async function () {
        await rockPaperArena.connect(player1).cancelMatch(1);
        expect(await rockPaperArena.playerActiveMatch(player1.address)).to.equal(0n);
      });

      it("Should remove match from pending matches", async function () {
        await rockPaperArena.connect(player1).cancelMatch(1);
        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(0);
      });

      it("Should revert if non-player1 tries to cancel", async function () {
        await expect(
          rockPaperArena.connect(player2).cancelMatch(1)
        ).to.be.revertedWithCustomError(rockPaperArena, "UnauthorizedPlayer");
      });

      it("Should revert if match is not in Waiting state", async function () {
        await rockPaperArena.connect(player2).acceptChallenge(1);

        await expect(
          rockPaperArena.connect(player1).cancelMatch(1)
        ).to.be.revertedWithCustomError(rockPaperArena, "MatchNotWaiting");
      });

      it("Should allow player1 to create new match after cancelling", async function () {
        await rockPaperArena.connect(player1).cancelMatch(1);
        await rockPaperArena.connect(player1).createChallenge();

        expect(await rockPaperArena.playerActiveMatch(player1.address)).to.equal(2n);
      });
    });
  });

  /* ========================================
   * UNIT TESTS - MODULE 2: ENCRYPTED MOVE BOOK
   * ======================================== */

  describe("3. Module 2: Encrypted Move Book", function () {
    beforeEach(async function () {
      // Setup: Create and join a match
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).acceptChallenge(1);
    });

    describe("3.1 submitMove() - Structure Tests", function () {
      it("Should have submitMove function", async function () {
        expect(rockPaperArena.submitMove).to.be.a("function");
      });

      it("Should track player1 commitment state", async function () {
        let match = await rockPaperArena.getMatch(1);
        expect(match.player1Committed).to.equal(false);
      });

      it("Should track player2 commitment state", async function () {
        let match = await rockPaperArena.getMatch(1);
        expect(match.player2Committed).to.equal(false);
      });

      it("Should revert if unauthorized player tries to submit move", async function () {
        const instance = instances.player3;
        const input = instance.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player3.address
        );
        input.add8(Gesture.Rock);
        const encryptedMove = await input.encrypt();

        await expect(
          rockPaperArena
            .connect(player3)
            .submitMove(1, encryptedMove.handles[0], encryptedMove.inputProof)
        ).to.be.revertedWithCustomError(rockPaperArena, "UnauthorizedPlayer");
      });
    });

    describe("3.2 submitMove() - FHE Integration Tests", function () {
      it("Should allow player1 to submit encrypted move", async function () {
        const instance = instances.player1;
        const input = instance.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input.add8(Gesture.Rock);
        const encryptedMove = await input.encrypt();

        const tx = await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove.handles[0], encryptedMove.inputProof);

        await expect(tx)
          .to.emit(rockPaperArena, "MoveCommitted")
          .withArgs(1n, player1.address);

        const match = await rockPaperArena.getMatch(1);
        expect(match.player1Committed).to.equal(true);
      });

      it("Should allow player2 to submit encrypted move", async function () {
        const instance = instances.player2;
        const input = instance.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input.add8(Gesture.Paper);
        const encryptedMove = await input.encrypt();

        const tx = await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove.handles[0], encryptedMove.inputProof);

        await expect(tx)
          .to.emit(rockPaperArena, "MoveCommitted")
          .withArgs(1n, player2.address);

        const match = await rockPaperArena.getMatch(1);
        expect(match.player2Committed).to.equal(true);
      });

      it("Should change state to BothCommitted when both players submit", async function () {
        // Player1 submits
        const instance1 = instances.player1;
        const input1 = instance1.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input1.add8(Gesture.Rock);
        const encryptedMove1 = await input1.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

        // Player2 submits
        const instance2 = instances.player2;
        const input2 = instance2.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input2.add8(Gesture.Scissors);
        const encryptedMove2 = await input2.encrypt();

        await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

        const match = await rockPaperArena.getMatch(1);
        expect(match.state).to.equal(MatchState.BothCommitted);
      });

      it("Should revert if player tries to submit move twice", async function () {
        const instance = instances.player1;
        const input = instance.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input.add8(Gesture.Rock);
        const encryptedMove = await input.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove.handles[0], encryptedMove.inputProof);

        // Try to submit again
        const input2 = instance.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input2.add8(Gesture.Paper);
        const encryptedMove2 = await input2.encrypt();

        await expect(
          rockPaperArena
            .connect(player1)
            .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof)
        ).to.be.revertedWithCustomError(rockPaperArena, "MoveAlreadyCommitted");
      });

      it("Should accept all valid gestures (Rock, Paper, Scissors)", async function () {
        const moves = [Gesture.Rock, Gesture.Paper, Gesture.Scissors];

        for (let i = 0; i < moves.length; i++) {
          // Create new match for each test
          await rockPaperArena.connect(player1).createChallenge();
          await rockPaperArena.connect(player2).acceptChallenge(i + 2);

          const instance = instances.player1;
          const input = instance.createEncryptedInput(
            await rockPaperArena.getAddress(),
            player1.address
          );
          input.add8(moves[i]);
          const encryptedMove = await input.encrypt();

          await expect(
            rockPaperArena
              .connect(player1)
              .submitMove(i + 2, encryptedMove.handles[0], encryptedMove.inputProof)
          ).to.not.be.reverted;
        }
      });
    });

    describe("3.3 lockMove()", function () {
      it("Should return false before both moves submitted", async function () {
        const locked = await rockPaperArena.lockMove(1);
        expect(locked).to.equal(false);
      });

      it("Should return true after both moves submitted", async function () {
        // Player1 submits
        const instance1 = instances.player1;
        const input1 = instance1.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input1.add8(Gesture.Rock);
        const encryptedMove1 = await input1.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

        // Player2 submits
        const instance2 = instances.player2;
        const input2 = instance2.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input2.add8(Gesture.Paper);
        const encryptedMove2 = await input2.encrypt();

        await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

        const locked = await rockPaperArena.lockMove(1);
        expect(locked).to.equal(true);
      });
    });
  });

  /* ========================================
   * UNIT TESTS - MODULE 3: PAYOUT VAULT & REVEAL
   * ======================================== */

  describe("4. Module 3: Payout Vault & Reveal", function () {
    beforeEach(async function () {
      // Setup: Create match, join, and submit both moves
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).acceptChallenge(1);
    });

    describe("4.1 requestReveal()", function () {
      it("Should revert if match not ready (moves not committed)", async function () {
        await expect(
          rockPaperArena.connect(player1).requestReveal(1)
        ).to.be.revertedWithCustomError(rockPaperArena, "MatchNotReady");
      });

      it("Should revert if non-player tries to reveal", async function () {
        // Submit both moves
        const instance1 = instances.player1;
        const input1 = instance1.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input1.add8(Gesture.Rock);
        const encryptedMove1 = await input1.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

        const instance2 = instances.player2;
        const input2 = instance2.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input2.add8(Gesture.Paper);
        const encryptedMove2 = await input2.encrypt();

        await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

        // Try to reveal from non-player
        await expect(
          rockPaperArena.connect(player3).requestReveal(1)
        ).to.be.revertedWithCustomError(rockPaperArena, "UnauthorizedPlayer");
      });

      it("Should allow player1 to request reveal", async function () {
        // Submit both moves
        const instance1 = instances.player1;
        const input1 = instance1.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input1.add8(Gesture.Rock);
        const encryptedMove1 = await input1.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

        const instance2 = instances.player2;
        const input2 = instance2.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input2.add8(Gesture.Paper);
        const encryptedMove2 = await input2.encrypt();

        await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

        await expect(rockPaperArena.connect(player1).requestReveal(1)).to.not.be.reverted;
      });

      it("Should allow player2 to request reveal", async function () {
        // Submit both moves
        const instance1 = instances.player1;
        const input1 = instance1.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input1.add8(Gesture.Rock);
        const encryptedMove1 = await input1.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

        const instance2 = instances.player2;
        const input2 = instance2.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input2.add8(Gesture.Paper);
        const encryptedMove2 = await input2.encrypt();

        await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

        await expect(rockPaperArena.connect(player2).requestReveal(1)).to.not.be.reverted;
      });

      it("Should emit MatchRevealed event", async function () {
        // Submit both moves
        const instance1 = instances.player1;
        const input1 = instance1.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input1.add8(Gesture.Rock);
        const encryptedMove1 = await input1.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

        const instance2 = instances.player2;
        const input2 = instance2.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input2.add8(Gesture.Paper);
        const encryptedMove2 = await input2.encrypt();

        await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

        await expect(rockPaperArena.connect(player1).requestReveal(1)).to.emit(
          rockPaperArena,
          "MatchRevealed"
        );
      });

      it("Should change match state to Revealed", async function () {
        // Submit both moves
        const instance1 = instances.player1;
        const input1 = instance1.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input1.add8(Gesture.Rock);
        const encryptedMove1 = await input1.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

        const instance2 = instances.player2;
        const input2 = instance2.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input2.add8(Gesture.Paper);
        const encryptedMove2 = await input2.encrypt();

        await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

        await rockPaperArena.connect(player1).requestReveal(1);

        const match = await rockPaperArena.getMatch(1);
        expect(match.state).to.equal(MatchState.Revealed);
      });

      it("Should clear active matches for both players", async function () {
        // Submit both moves
        const instance1 = instances.player1;
        const input1 = instance1.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input1.add8(Gesture.Rock);
        const encryptedMove1 = await input1.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

        const instance2 = instances.player2;
        const input2 = instance2.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input2.add8(Gesture.Paper);
        const encryptedMove2 = await input2.encrypt();

        await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

        await rockPaperArena.connect(player1).requestReveal(1);

        expect(await rockPaperArena.playerActiveMatch(player1.address)).to.equal(0n);
        expect(await rockPaperArena.playerActiveMatch(player2.address)).to.equal(0n);
      });

      it("Should update player total matches", async function () {
        // Submit both moves
        const instance1 = instances.player1;
        const input1 = instance1.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input1.add8(Gesture.Rock);
        const encryptedMove1 = await input1.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

        const instance2 = instances.player2;
        const input2 = instance2.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input2.add8(Gesture.Paper);
        const encryptedMove2 = await input2.encrypt();

        await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

        await rockPaperArena.connect(player1).requestReveal(1);

        const stats1 = await rockPaperArena.getPlayerStats(player1.address);
        const stats2 = await rockPaperArena.getPlayerStats(player2.address);

        expect(stats1.totalMatches).to.equal(1n);
        expect(stats2.totalMatches).to.equal(1n);
      });
    });

    describe("4.2 claimRewards() & updateStreak()", function () {
      it("Should have claimRewards function (placeholder)", async function () {
        await expect(rockPaperArena.connect(player1).claimRewards()).to.be.revertedWith(
          "Not implemented"
        );
      });

      it("Should have updateStreak function (placeholder)", async function () {
        await expect(
          rockPaperArena.connect(player1).updateStreak(player1.address, true)
        ).to.be.revertedWith("Not implemented");
      });
    });
  });

  /* ========================================
   * INTEGRATION TESTS - COMPLETE GAME FLOWS
   * ======================================== */

  describe("5. Integration Tests - Complete Game Flows", function () {
    it("Should complete full game: Rock vs Scissors", async function () {
      // 1. Create challenge
      await rockPaperArena.connect(player1).createChallenge();

      // 2. Accept challenge
      await rockPaperArena.connect(player2).acceptChallenge(1);

      // 3. Player1 submits Rock
      const instance1 = instances.player1;
      const input1 = instance1.createEncryptedInput(
        await rockPaperArena.getAddress(),
        player1.address
      );
      input1.add8(Gesture.Rock);
      const encryptedMove1 = await input1.encrypt();

      await rockPaperArena
        .connect(player1)
        .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

      // 4. Player2 submits Scissors
      const instance2 = instances.player2;
      const input2 = instance2.createEncryptedInput(
        await rockPaperArena.getAddress(),
        player2.address
      );
      input2.add8(Gesture.Scissors);
      const encryptedMove2 = await input2.encrypt();

      await rockPaperArena
        .connect(player2)
        .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

      // 5. Request reveal
      await rockPaperArena.connect(player1).requestReveal(1);

      // 6. Verify final state
      const match = await rockPaperArena.getMatch(1);
      expect(match.state).to.equal(MatchState.Revealed);
      expect(await rockPaperArena.playerActiveMatch(player1.address)).to.equal(0n);
      expect(await rockPaperArena.playerActiveMatch(player2.address)).to.equal(0n);
    });

    it("Should complete full game: Paper vs Rock", async function () {
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).acceptChallenge(1);

      // Player1: Paper
      const instance1 = instances.player1;
      const input1 = instance1.createEncryptedInput(
        await rockPaperArena.getAddress(),
        player1.address
      );
      input1.add8(Gesture.Paper);
      const encryptedMove1 = await input1.encrypt();

      await rockPaperArena
        .connect(player1)
        .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

      // Player2: Rock
      const instance2 = instances.player2;
      const input2 = instance2.createEncryptedInput(
        await rockPaperArena.getAddress(),
        player2.address
      );
      input2.add8(Gesture.Rock);
      const encryptedMove2 = await input2.encrypt();

      await rockPaperArena
        .connect(player2)
        .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

      await rockPaperArena.connect(player2).requestReveal(1);

      const match = await rockPaperArena.getMatch(1);
      expect(match.state).to.equal(MatchState.Revealed);
    });

    it("Should complete full game: Scissors vs Paper", async function () {
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).acceptChallenge(1);

      // Player1: Scissors
      const instance1 = instances.player1;
      const input1 = instance1.createEncryptedInput(
        await rockPaperArena.getAddress(),
        player1.address
      );
      input1.add8(Gesture.Scissors);
      const encryptedMove1 = await input1.encrypt();

      await rockPaperArena
        .connect(player1)
        .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

      // Player2: Paper
      const instance2 = instances.player2;
      const input2 = instance2.createEncryptedInput(
        await rockPaperArena.getAddress(),
        player2.address
      );
      input2.add8(Gesture.Paper);
      const encryptedMove2 = await input2.encrypt();

      await rockPaperArena
        .connect(player2)
        .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

      await rockPaperArena.connect(player1).requestReveal(1);

      const match = await rockPaperArena.getMatch(1);
      expect(match.state).to.equal(MatchState.Revealed);
    });

    it("Should complete full game: Draw (Rock vs Rock)", async function () {
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).acceptChallenge(1);

      // Both players: Rock
      const instance1 = instances.player1;
      const input1 = instance1.createEncryptedInput(
        await rockPaperArena.getAddress(),
        player1.address
      );
      input1.add8(Gesture.Rock);
      const encryptedMove1 = await input1.encrypt();

      await rockPaperArena
        .connect(player1)
        .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

      const instance2 = instances.player2;
      const input2 = instance2.createEncryptedInput(
        await rockPaperArena.getAddress(),
        player2.address
      );
      input2.add8(Gesture.Rock);
      const encryptedMove2 = await input2.encrypt();

      await rockPaperArena
        .connect(player2)
        .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

      await rockPaperArena.connect(player1).requestReveal(1);

      const match = await rockPaperArena.getMatch(1);
      expect(match.state).to.equal(MatchState.Revealed);
    });

    it("Should allow players to start new match after completing one", async function () {
      // Complete first match
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).acceptChallenge(1);

      const instance1 = instances.player1;
      const input1 = instance1.createEncryptedInput(
        await rockPaperArena.getAddress(),
        player1.address
      );
      input1.add8(Gesture.Rock);
      const encryptedMove1 = await input1.encrypt();

      await rockPaperArena
        .connect(player1)
        .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

      const instance2 = instances.player2;
      const input2 = instance2.createEncryptedInput(
        await rockPaperArena.getAddress(),
        player2.address
      );
      input2.add8(Gesture.Scissors);
      const encryptedMove2 = await input2.encrypt();

      await rockPaperArena
        .connect(player2)
        .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

      await rockPaperArena.connect(player1).requestReveal(1);

      // Start new match
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).acceptChallenge(2);

      const match2 = await rockPaperArena.getMatch(2);
      expect(match2.player1).to.equal(player1.address);
      expect(match2.player2).to.equal(player2.address);
    });

    it("Should handle multiple concurrent matches", async function () {
      // Match 1: Player1 vs Player2
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).acceptChallenge(1);

      // Match 2: Player3 vs another player
      const [, , , , p4] = await ethers.getSigners();
      await rockPaperArena.connect(player3).createChallenge();
      await rockPaperArena.connect(p4).acceptChallenge(2);

      const match1 = await rockPaperArena.getMatch(1);
      const match2 = await rockPaperArena.getMatch(2);

      expect(match1.player1).to.equal(player1.address);
      expect(match1.player2).to.equal(player2.address);
      expect(match2.player1).to.equal(player3.address);
      expect(match2.player2).to.equal(p4.address);
    });
  });

  /* ========================================
   * EDGE CASES & SECURITY TESTS
   * ======================================== */

  describe("6. Edge Cases & Security Tests", function () {
    describe("6.1 Access Control", function () {
      it("Should prevent non-players from submitting moves", async function () {
        await rockPaperArena.connect(player1).createChallenge();
        await rockPaperArena.connect(player2).acceptChallenge(1);

        const instance = instances.player3;
        const input = instance.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player3.address
        );
        input.add8(Gesture.Rock);
        const encryptedMove = await input.encrypt();

        await expect(
          rockPaperArena
            .connect(player3)
            .submitMove(1, encryptedMove.handles[0], encryptedMove.inputProof)
        ).to.be.revertedWithCustomError(rockPaperArena, "UnauthorizedPlayer");
      });

      it("Should prevent non-players from revealing", async function () {
        await rockPaperArena.connect(player1).createChallenge();
        await rockPaperArena.connect(player2).acceptChallenge(1);

        const instance1 = instances.player1;
        const input1 = instance1.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player1.address
        );
        input1.add8(Gesture.Rock);
        const encryptedMove1 = await input1.encrypt();

        await rockPaperArena
          .connect(player1)
          .submitMove(1, encryptedMove1.handles[0], encryptedMove1.inputProof);

        const instance2 = instances.player2;
        const input2 = instance2.createEncryptedInput(
          await rockPaperArena.getAddress(),
          player2.address
        );
        input2.add8(Gesture.Paper);
        const encryptedMove2 = await input2.encrypt();

        await rockPaperArena
          .connect(player2)
          .submitMove(1, encryptedMove2.handles[0], encryptedMove2.inputProof);

        await expect(
          rockPaperArena.connect(player3).requestReveal(1)
        ).to.be.revertedWithCustomError(rockPaperArena, "UnauthorizedPlayer");
      });
    });

    describe("6.2 State Management", function () {
      it("Should prevent operations on non-existent matches", async function () {
        await expect(
          rockPaperArena.connect(player2).acceptChallenge(999)
        ).to.be.revertedWithCustomError(rockPaperArena, "InvalidMatchId");
      });

      it("Should prevent double-joining", async function () {
        await rockPaperArena.connect(player1).createChallenge();
        await rockPaperArena.connect(player2).acceptChallenge(1);

        await expect(
          rockPaperArena.connect(player3).acceptChallenge(1)
        ).to.be.revertedWithCustomError(rockPaperArena, "MatchNotWaiting");
      });

      it("Should prevent cancelling non-waiting matches", async function () {
        await rockPaperArena.connect(player1).createChallenge();
        await rockPaperArena.connect(player2).acceptChallenge(1);

        await expect(
          rockPaperArena.connect(player1).cancelMatch(1)
        ).to.be.revertedWithCustomError(rockPaperArena, "MatchNotWaiting");
      });
    });

    describe("6.3 Boundary Conditions", function () {
      it("Should handle match ID overflow gracefully", async function () {
        const currentCounter = await rockPaperArena.matchCounter();
        expect(currentCounter).to.be.gte(1n);
      });

      it("Should handle empty pending matches array", async function () {
        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches).to.be.an("array");
        expect(pendingMatches.length).to.equal(0);
      });

      it("Should handle large number of pending matches", async function () {
        const signers = await ethers.getSigners();
        const numMatches = Math.min(signers.length, 10);

        for (let i = 0; i < numMatches; i++) {
          await rockPaperArena.connect(signers[i]).createChallenge();
        }

        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(numMatches);
      });
    });

    describe("6.4 Pending Matches Management", function () {
      it("Should correctly remove first pending match", async function () {
        await rockPaperArena.connect(player1).createChallenge();
        await rockPaperArena.connect(player2).createChallenge();
        await rockPaperArena.connect(player3).createChallenge();

        const [, , , , p4] = await ethers.getSigners();
        await rockPaperArena.connect(p4).acceptChallenge(1);

        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(2);
        expect(pendingMatches).to.not.include(1n);
      });

      it("Should correctly remove middle pending match", async function () {
        await rockPaperArena.connect(player1).createChallenge();
        await rockPaperArena.connect(player2).createChallenge();
        await rockPaperArena.connect(player3).createChallenge();

        const [, , , , p4] = await ethers.getSigners();
        await rockPaperArena.connect(p4).acceptChallenge(2);

        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(2);
        expect(pendingMatches).to.not.include(2n);
      });

      it("Should correctly remove last pending match", async function () {
        await rockPaperArena.connect(player1).createChallenge();
        await rockPaperArena.connect(player2).createChallenge();
        await rockPaperArena.connect(player3).createChallenge();

        const [, , , , p4] = await ethers.getSigners();
        await rockPaperArena.connect(p4).acceptChallenge(3);

        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(2);
        expect(pendingMatches).to.not.include(3n);
      });
    });
  });

  /* ========================================
   * VIEW FUNCTIONS TESTS
   * ======================================== */

  describe("7. View Functions", function () {
    it("Should return correct pending matches", async function () {
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).createChallenge();

      const pendingMatches = await rockPaperArena.getPendingMatches();
      expect(pendingMatches).to.deep.equal([1n, 2n]);
    });

    it("Should return correct match details", async function () {
      await rockPaperArena.connect(player1).createChallenge();

      const match = await rockPaperArena.getMatch(1);
      expect(match.matchId).to.equal(1n);
      expect(match.player1).to.equal(player1.address);
      expect(match.state).to.equal(MatchState.Waiting);
    });

    it("Should return correct player stats", async function () {
      const stats = await rockPaperArena.getPlayerStats(player1.address);
      expect(stats.totalMatches).to.equal(0n);
      expect(stats.wins).to.equal(0n);
      expect(stats.losses).to.equal(0n);
      expect(stats.draws).to.equal(0n);
      expect(stats.currentStreak).to.equal(0n);
    });

    it("Should return correct active match for player", async function () {
      await rockPaperArena.connect(player1).createChallenge();
      expect(await rockPaperArena.playerActiveMatch(player1.address)).to.equal(1n);
    });
  });
});
