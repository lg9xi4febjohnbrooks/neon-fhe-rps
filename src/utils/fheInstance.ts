/**
 * FHE Instance Initialization
 *
 * This module handles FHE SDK initialization using CDN script tag.
 * SDK is loaded via script tag in index.html and accessed through window object.
 *
 * @see FHE Development Guide Section 4 - SDK Initialization
 */

import { bytesToHex } from 'viem';

declare global {
  interface Window {
    RelayerSDK?: any;
    relayerSDK?: any;
    ethereum?: any;
    okxwallet?: any;
  }
}

type FhevmInstance = any;

let fheInstance: FhevmInstance | null = null;
let isInitializing = false;
let initializationPromise: Promise<any> | null = null;

/**
 * Extract Relayer SDK from the window object
 */
function getSdkFromWindow() {
  if (typeof window === 'undefined') {
    throw new Error('[FHE] Relayer SDK requires a browser environment');
  }

  const sdk = window.RelayerSDK || window.relayerSDK;
  if (!sdk) {
    throw new Error('[FHE] Relayer SDK not loaded. Ensure the CDN script is present in index.html');
  }

  return sdk;
}

/**
 * Initialize FHE SDK from window object (loaded via CDN script tag)
 * Uses singleton pattern to ensure single instance
 *
 * @param provider - Optional Ethereum provider
 * @returns Promise<FHEInstance> - Initialized FHE instance
 * @throws Error if initialization fails
 */
export async function initializeFHE(provider?: any): Promise<any> {
  // Return existing instance if already initialized
  if (fheInstance) {
    console.log('[FHE] Using existing instance');
    return fheInstance;
  }

  // Wait for ongoing initialization
  if (isInitializing && initializationPromise) {
    console.log('[FHE] Waiting for ongoing initialization');
    return initializationPromise;
  }

  isInitializing = true;
  console.log('[FHE] Starting initialization from window.RelayerSDK...');

  initializationPromise = (async () => {
    try {
      // Get SDK from window object (loaded via script tag)
      const sdk = getSdkFromWindow();
      console.log('[FHE] SDK loaded from window object');

      const { initSDK, createInstance, SepoliaConfig } = sdk;

      // Initialize WASM module
      console.log('[FHE] Initializing WASM...');
      await initSDK();
      console.log('[FHE] WASM initialized');

      // Get Ethereum provider
      const ethereumProvider =
        provider ||
        window.ethereum ||
        window.okxwallet?.provider ||
        window.okxwallet ||
        SepoliaConfig.network;

      // Create FHE instance with Sepolia configuration
      console.log('[FHE] Creating FHE instance with SepoliaConfig...');
      const config = {
        ...SepoliaConfig,
        network: ethereumProvider,
      };

      fheInstance = await createInstance(config);
      console.log('[FHE] Instance created successfully');

      return fheInstance;
    } catch (error) {
      console.error('[FHE] Initialization failed:', error);
      isInitializing = false;
      initializationPromise = null;
      throw new Error(`FHE initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      isInitializing = false;
    }
  })();

  return initializationPromise;
}

/**
 * Reset FHE instance (useful for testing)
 */
export function resetFheInstance(): void {
  fheInstance = null;
  isInitializing = false;
  initializationPromise = null;
}

/**
 * Get current FHE instance
 * @returns FHE instance or null if not initialized
 */
export function getFHEInstance() {
  return fheInstance;
}

/**
 * Create encrypted input for contract call
 *
 * @param contractAddress - Target contract address
 * @param userAddress - User wallet address
 * @returns EncryptedInput builder instance
 * @throws Error if FHE not initialized
 */
export async function createEncryptedInput(
  contractAddress: string,
  userAddress: string
) {
  if (!fheInstance) {
    throw new Error('FHE not initialized. Call initializeFHE() first.');
  }

  return fheInstance.createEncryptedInput(contractAddress, userAddress);
}

/**
 * Encrypt a uint8 value (0-255)
 * Used for Rock (0), Paper (1), Scissors (2)
 *
 * @param value - Value to encrypt (0-255)
 * @param contractAddress - Target contract address
 * @param userAddress - User wallet address
 * @returns Object containing handle and inputProof
 */
export async function encryptUint8(
  value: number,
  contractAddress: string,
  userAddress: string
): Promise<{ handle: string; inputProof: string }> {
  console.log(`[FHE] Encrypting uint8 value: ${value}`);

  if (value < 0 || value > 255) {
    throw new Error('Value must be between 0 and 255');
  }

  if (!fheInstance) {
    throw new Error('FHE not initialized');
  }

  try {
    // Create encrypted input
    const input = fheInstance.createEncryptedInput(contractAddress, userAddress);

    // Add uint8 value
    input.add8(BigInt(value));

    // Encrypt and get handles + proof
    const encrypted = await input.encrypt();

    console.log('[FHE] Encryption successful');
    console.log('[FHE] Handle (raw):', encrypted.handles[0]);
    console.log('[FHE] Proof length:', encrypted.inputProof.length);

    // Convert Uint8Array to hex using viem's bytesToHex
    const handleHex = bytesToHex(encrypted.handles[0]);
    const proofHex = bytesToHex(encrypted.inputProof);

    console.log('[FHE] Handle (hex):', handleHex);
    console.log('[FHE] Proof (hex):', proofHex);

    return {
      handle: handleHex,
      inputProof: proofHex,
    };
  } catch (error) {
    console.error('[FHE] Encryption failed:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if FHE is initialized
 * @returns boolean
 */
export function isFHEInitialized(): boolean {
  return fheInstance !== null;
}
