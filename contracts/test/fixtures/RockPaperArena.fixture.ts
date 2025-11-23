/**
 * Test Fixtures for RockPaperArena
 *
 * Provides reusable deployment fixtures for testing
 * Following Hardhat best practices for test setup.
 *
 * @module test/fixtures
 */

import { ethers } from "hardhat";
import { RockPaperArena } from "../../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Deployment fixture return type
 */
export interface RockPaperArenaFixture {
  rockPaperArena: RockPaperArena;
  owner: HardhatEthersSigner;
  player1: HardhatEthersSigner;
  player2: HardhatEthersSigner;
  player3: HardhatEthersSigner;
}

/**
 * Deploy RockPaperArena contract with default configuration
 *
 * @returns Deployment fixture with contract and signers
 */
export async function deployRockPaperArenaFixture(): Promise<RockPaperArenaFixture> {
  // Get signers
  const [owner, player1, player2, player3] = await ethers.getSigners();

  // Deploy contract
  const RockPaperArenaFactory = await ethers.getContractFactory("RockPaperArena");
  const rockPaperArena = (await RockPaperArenaFactory.deploy()) as any as RockPaperArena;
  await rockPaperArena.waitForDeployment();

  return {
    rockPaperArena,
    owner,
    player1,
    player2,
    player3,
  };
}

/**
 * Deploy contract and create a match in Waiting state
 *
 * @returns Fixture with contract, signers, and matchId
 */
export async function deployWithWaitingMatch(): Promise<
  RockPaperArenaFixture & { matchId: bigint }
> {
  const fixture = await deployRockPaperArenaFixture();
  const { rockPaperArena, player1 } = fixture;

  // Create a match
  const tx = await rockPaperArena.connect(player1).createChallenge();
  await tx.wait();

  return {
    ...fixture,
    matchId: 1n,
  };
}

/**
 * Deploy contract and create a match with both players joined
 *
 * @returns Fixture with contract, signers, and matchId
 */
export async function deployWithActiveMatch(): Promise<
  RockPaperArenaFixture & { matchId: bigint }
> {
  const fixture = await deployWithWaitingMatch();
  const { rockPaperArena, player2 } = fixture;

  // Player2 joins the match
  const tx = await rockPaperArena.connect(player2).acceptChallenge(1);
  await tx.wait();

  return {
    ...fixture,
    matchId: 1n,
  };
}

/**
 * Deploy contract with multiple pending matches
 *
 * @param numMatches - Number of pending matches to create
 * @returns Fixture with contract, signers, and matchIds
 */
export async function deployWithMultiplePendingMatches(
  numMatches: number = 3
): Promise<RockPaperArenaFixture & { matchIds: bigint[] }> {
  const fixture = await deployRockPaperArenaFixture();
  const { rockPaperArena } = fixture;
  const signers = await ethers.getSigners();

  const matchIds: bigint[] = [];

  for (let i = 0; i < numMatches && i < signers.length; i++) {
    const tx = await rockPaperArena.connect(signers[i]).createChallenge();
    await tx.wait();
    matchIds.push(BigInt(i + 1));
  }

  return {
    ...fixture,
    matchIds,
  };
}
