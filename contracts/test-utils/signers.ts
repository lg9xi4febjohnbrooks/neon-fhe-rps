/**
 * Signer Management for Testing
 *
 * Provides utilities to manage test signers and their configuration
 * for FHE operations in Hardhat test environment.
 *
 * @module test-utils/signers
 */

import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// Store signers globally for reuse
let cachedSigners: { [key: string]: HardhatEthersSigner } = {};

/**
 * Initialize and cache signers for testing
 *
 * @returns Promise that resolves when signers are initialized
 */
export async function initSigners(): Promise<void> {
  const signers = await ethers.getSigners();

  cachedSigners = {
    owner: signers[0],
    player1: signers[1],
    player2: signers[2],
    player3: signers[3],
    player4: signers[4] || signers[0], // Fallback to owner if not enough signers
    player5: signers[5] || signers[0],
  };
}

/**
 * Get cached signers
 *
 * @returns Object containing named signers
 */
export function getSigners(): { [key: string]: HardhatEthersSigner } {
  if (Object.keys(cachedSigners).length === 0) {
    throw new Error("Signers not initialized. Call initSigners() first.");
  }
  return cachedSigners;
}

/**
 * Get a specific signer by name
 *
 * @param name - Signer name (owner, player1, player2, etc.)
 * @returns The requested signer
 */
export function getSigner(name: string): HardhatEthersSigner {
  const signers = getSigners();
  if (!signers[name]) {
    throw new Error(`Signer "${name}" not found`);
  }
  return signers[name];
}

/**
 * Get all player signers (excluding owner)
 *
 * @returns Array of player signers
 */
export function getPlayerSigners(): HardhatEthersSigner[] {
  const signers = getSigners();
  return [
    signers.player1,
    signers.player2,
    signers.player3,
    signers.player4,
    signers.player5,
  ].filter((s) => s !== undefined);
}

/**
 * Get signer by index
 *
 * @param index - Signer index
 * @returns The signer at the specified index
 */
export async function getSignerByIndex(index: number): Promise<HardhatEthersSigner> {
  const signers = await ethers.getSigners();
  if (index >= signers.length) {
    throw new Error(`Signer index ${index} out of range (available: ${signers.length})`);
  }
  return signers[index];
}
