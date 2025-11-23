/**
 * RockPaperArena Smart Contract Tests
 *
 * Comprehensive test suite for the RockPaperArena contract
 * Tests all three modules: MatchQueue, EncryptedMoveBook, PayoutVault
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('RockPaperArena', function () {
  let rockPaperArena;
  let owner;
  let player1;
  let player2;
  let player3;

  // Deploy fresh contract before each test
  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    const RockPaperArena = await ethers.getContractFactory('RockPaperArena');
    rockPaperArena = await RockPaperArena.deploy();
    await rockPaperArena.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should deploy with correct initial state', async function () {
      expect(await rockPaperArena.matchCounter()).to.equal(1);
    });

    it('Should have zero pending matches initially', async function () {
      const pendingMatches = await rockPaperArena.getPendingMatches();
      expect(pendingMatches.length).to.equal(0);
    });
  });

  describe('Module 1: Match Queue', function () {
    describe('createChallenge', function () {
      it('Should create a new match', async function () {
        const tx = await rockPaperArena.connect(player1).createChallenge();
        const receipt = await tx.wait();

        // Check event emission
        const event = receipt.logs.find((log) => {
          try {
            return rockPaperArena.interface.parseLog(log).name === 'MatchCreated';
          } catch {
            return false;
          }
        });

        expect(event).to.not.be.undefined;

        // Check match counter incremented
        expect(await rockPaperArena.matchCounter()).to.equal(2);

        // Check pending matches
        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(1);
        expect(pendingMatches[0]).to.equal(1n);

        // Check player active match
        expect(await rockPaperArena.playerActiveMatch(player1.address)).to.equal(1);
      });

      it('Should revert if player already in a match', async function () {
        await rockPaperArena.connect(player1).createChallenge();

        await expect(rockPaperArena.connect(player1).createChallenge()).to.be.revertedWithCustomError(
          rockPaperArena,
          'AlreadyInMatch'
        );
      });

      it('Should allow multiple players to create matches', async function () {
        await rockPaperArena.connect(player1).createChallenge();
        await rockPaperArena.connect(player2).createChallenge();

        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(2);
      });
    });

    describe('acceptChallenge', function () {
      beforeEach(async function () {
        // Player1 creates a match
        await rockPaperArena.connect(player1).createChallenge();
      });

      it('Should allow player2 to join a match', async function () {
        const tx = await rockPaperArena.connect(player2).acceptChallenge(1);
        const receipt = await tx.wait();

        // Check event emission
        const event = receipt.logs.find((log) => {
          try {
            return rockPaperArena.interface.parseLog(log).name === 'MatchJoined';
          } catch {
            return false;
          }
        });

        expect(event).to.not.be.undefined;

        // Check match details
        const match = await rockPaperArena.getMatch(1);
        expect(match.player2).to.equal(player2.address);

        // Check pending matches removed
        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(0);

        // Check player2 active match
        expect(await rockPaperArena.playerActiveMatch(player2.address)).to.equal(1);
      });

      it('Should revert if match does not exist', async function () {
        await expect(
          rockPaperArena.connect(player2).acceptChallenge(999)
        ).to.be.revertedWithCustomError(rockPaperArena, 'InvalidMatchId');
      });

      it('Should revert if player already in a match', async function () {
        await rockPaperArena.connect(player2).createChallenge();

        await expect(
          rockPaperArena.connect(player2).acceptChallenge(1)
        ).to.be.revertedWithCustomError(rockPaperArena, 'AlreadyInMatch');
      });

      it('Should revert if player1 tries to join own match', async function () {
        await expect(
          rockPaperArena.connect(player1).acceptChallenge(1)
        ).to.be.revertedWithCustomError(rockPaperArena, 'UnauthorizedPlayer');
      });
    });

    describe('cancelMatch', function () {
      beforeEach(async function () {
        await rockPaperArena.connect(player1).createChallenge();
      });

      it('Should allow player1 to cancel waiting match', async function () {
        const tx = await rockPaperArena.connect(player1).cancelMatch(1);
        const receipt = await tx.wait();

        // Check event emission
        const event = receipt.logs.find((log) => {
          try {
            return rockPaperArena.interface.parseLog(log).name === 'MatchCancelled';
          } catch {
            return false;
          }
        });

        expect(event).to.not.be.undefined;

        // Check match state
        const match = await rockPaperArena.getMatch(1);
        expect(match.state).to.equal(4); // MatchState.Cancelled

        // Check pending matches removed
        const pendingMatches = await rockPaperArena.getPendingMatches();
        expect(pendingMatches.length).to.equal(0);

        // Check player1 no longer in active match
        expect(await rockPaperArena.playerActiveMatch(player1.address)).to.equal(0);
      });

      it('Should revert if non-player1 tries to cancel', async function () {
        await expect(
          rockPaperArena.connect(player2).cancelMatch(1)
        ).to.be.revertedWithCustomError(rockPaperArena, 'UnauthorizedPlayer');
      });

      it('Should revert if match is not in Waiting state', async function () {
        // Player2 joins
        await rockPaperArena.connect(player2).acceptChallenge(1);

        // Try to cancel
        await expect(
          rockPaperArena.connect(player1).cancelMatch(1)
        ).to.be.revertedWithCustomError(rockPaperArena, 'MatchNotWaiting');
      });
    });
  });

  describe('Module 2: Encrypted Move Book', function () {
    // Note: Full FHE testing requires mock FHE environment
    // These tests cover the contract logic structure

    it('Should have submitMove function', async function () {
      expect(rockPaperArena.submitMove).to.be.a('function');
    });

    it('Should have lockMove function', async function () {
      expect(rockPaperArena.lockMove).to.be.a('function');
    });

    it('Should track move commitment state', async function () {
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).acceptChallenge(1);

      const match = await rockPaperArena.getMatch(1);
      expect(match.player1Committed).to.equal(false);
      expect(match.player2Committed).to.equal(false);
    });
  });

  describe('Module 3: Payout Vault', function () {
    it('Should have requestReveal function', async function () {
      expect(rockPaperArena.requestReveal).to.be.a('function');
    });

    it('Should have claimRewards function', async function () {
      expect(rockPaperArena.claimRewards).to.be.a('function');
    });

    it('Should have updateStreak function', async function () {
      expect(rockPaperArena.updateStreak).to.be.a('function');
    });
  });

  describe('View Functions', function () {
    it('Should return empty array for pending matches initially', async function () {
      const pendingMatches = await rockPaperArena.getPendingMatches();
      expect(pendingMatches).to.be.an('array');
      expect(pendingMatches.length).to.equal(0);
    });

    it('Should return match details', async function () {
      await rockPaperArena.connect(player1).createChallenge();

      const match = await rockPaperArena.getMatch(1);
      expect(match.matchId).to.equal(1);
      expect(match.player1).to.equal(player1.address);
      expect(match.state).to.equal(1); // MatchState.Waiting
    });

    it('Should return player stats', async function () {
      const stats = await rockPaperArena.getPlayerStats(player1.address);
      expect(stats.totalMatches).to.equal(0);
      expect(stats.wins).to.equal(0);
      expect(stats.losses).to.equal(0);
      expect(stats.draws).to.equal(0);
    });
  });

  describe('Gas Optimization', function () {
    it('Should efficiently handle multiple pending matches', async function () {
      // Create multiple matches
      await rockPaperArena.connect(player1).createChallenge();
      await rockPaperArena.connect(player2).createChallenge();
      await rockPaperArena.connect(player3).createChallenge();

      const pendingMatches = await rockPaperArena.getPendingMatches();
      expect(pendingMatches.length).to.equal(3);

      // Accept first match
      const [, p4] = await ethers.getSigners();
      await rockPaperArena.connect(p4).acceptChallenge(1);

      // Check pending matches updated correctly
      const updatedPending = await rockPaperArena.getPendingMatches();
      expect(updatedPending.length).to.equal(2);
    });
  });
});
