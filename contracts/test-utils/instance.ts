/**
 * FHE Instance Management for Testing
 *
 * Provides utilities to create and manage FHE instances for encrypted operations
 * in test environments using Zama's fhevmjs library.
 *
 * @module test-utils/instance
 */

import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// Import fhevmjs dynamically
let fhevmjs: any;

/**
 * Initialize fhevmjs library
 */
async function initFhevmjs() {
  if (!fhevmjs) {
    try {
      fhevmjs = await import("fhevmjs/node");
    } catch (error) {
      console.error("Failed to load fhevmjs:", error);
      throw new Error("fhevmjs not available. Install with: npm install fhevmjs");
    }
  }
  return fhevmjs;
}

/**
 * Create FHE instance for a specific contract and user
 *
 * @param contractAddress - The contract address to create instance for
 * @param userAddress - The user address for ACL permissions
 * @param ethersProvider - Ethers provider
 * @param network - Network configuration (optional)
 * @returns FHE instance
 */
export async function createInstance(
  contractAddress: string,
  userAddress: string,
  ethersProvider: any,
  network?: any
): Promise<any> {
  const fhevm = await initFhevmjs();

  // Create instance with local network config for Hardhat
  const instance = await fhevm.createInstance({
    chainId: 31337, // Hardhat chain ID
    publicKey: network?.publicKey,
    gatewayUrl: network?.gatewayUrl || "http://localhost:8545",
    aclAddress: network?.aclAddress,
    kmsVerifierAddress: network?.kmsVerifierAddress,
  });

  return instance;
}

/**
 * Create FHE instances for multiple signers
 *
 * @param contractAddress - The contract address
 * @param ethersModule - Ethers module
 * @param signers - Array of signers
 * @returns Object mapping signer names to FHE instances
 */
export async function createInstances(
  contractAddress: string,
  ethersModule: typeof ethers,
  signers: { [key: string]: HardhatEthersSigner }
): Promise<{ [key: string]: any }> {
  const instances: { [key: string]: any } = {};

  for (const [name, signer] of Object.entries(signers)) {
    try {
      instances[name] = await createInstance(
        contractAddress,
        signer.address,
        ethersModule.provider
      );
    } catch (error) {
      console.warn(`Failed to create FHE instance for ${name}:`, error);
      // Create mock instance for testing without fhevmjs
      instances[name] = createMockInstance(contractAddress, signer.address);
    }
  }

  return instances;
}

/**
 * Create a mock FHE instance for testing when fhevmjs is not available
 * This allows tests to run without full FHE setup
 *
 * @param contractAddress - Contract address
 * @param userAddress - User address
 * @returns Mock FHE instance
 */
function createMockInstance(contractAddress: string, userAddress: string): any {
  return {
    createEncryptedInput: (contract: string, user: string) => {
      const values: bigint[] = [];

      return {
        add8: (value: number | bigint) => {
          values.push(BigInt(value));
        },
        add16: (value: number | bigint) => {
          values.push(BigInt(value));
        },
        add32: (value: number | bigint) => {
          values.push(BigInt(value));
        },
        add64: (value: number | bigint) => {
          values.push(BigInt(value));
        },
        addBool: (value: boolean) => {
          values.push(value ? 1n : 0n);
        },
        encrypt: async () => {
          // Generate mock encrypted data
          const handles = values.map((val, idx) => {
            // Create a mock handle (32 bytes hex)
            const handleBytes = Buffer.alloc(32);
            handleBytes.writeBigUInt64BE(val, 24);
            handleBytes.writeUInt8(idx, 0);
            return "0x" + handleBytes.toString("hex");
          });

          // Generate mock proof (variable length hex)
          const proof = "0x" + Buffer.alloc(64).fill(0).toString("hex");

          return {
            handles,
            inputProof: proof,
          };
        },
      };
    },

    // Mock decrypt function
    decrypt: async (contractAddress: string, handle: string) => {
      // For testing, extract value from mock handle
      const handleBuffer = Buffer.from(handle.slice(2), "hex");
      const value = handleBuffer.readBigUInt64BE(24);
      return value;
    },

    // Mock reencrypt function
    reencrypt: async (
      handle: string,
      privateKey: string,
      publicKey: string,
      signature: string,
      contractAddress: string,
      userAddress: string
    ) => {
      // Return mock reencrypted value
      return BigInt(0);
    },
  };
}

/**
 * Generate EIP-712 signature for reencryption
 *
 * @param instance - FHE instance
 * @param contractAddress - Contract address
 * @param userAddress - User address
 * @param signer - Ethers signer
 * @returns Signature object with public key and signature
 */
export async function generateSignature(
  instance: any,
  contractAddress: string,
  userAddress: string,
  signer: HardhatEthersSigner
): Promise<any> {
  try {
    // Get public key from instance
    const publicKey = instance.generatePublicKey();

    // Generate EIP-712 signature
    const eip712Domain = {
      name: "Authorization token",
      version: "1",
      chainId: 31337,
      verifyingContract: contractAddress,
    };

    const types = {
      Reencrypt: [
        { name: "publicKey", type: "bytes" },
        { name: "userAddress", type: "address" },
      ],
    };

    const message = {
      publicKey: publicKey,
      userAddress: userAddress,
    };

    const signature = await signer.signTypedData(eip712Domain, types, message);

    return {
      publicKey,
      signature,
    };
  } catch (error) {
    console.warn("Failed to generate signature:", error);
    // Return mock signature for testing
    return {
      publicKey: "0x" + Buffer.alloc(32).fill(1).toString("hex"),
      signature: "0x" + Buffer.alloc(65).fill(0).toString("hex"),
    };
  }
}
