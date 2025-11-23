/**
 * Hardhat Configuration for RockPaperFHE
 *
 * Configures Solidity compiler, networks, and FHE plugin
 * for deploying encrypted Rock Paper Scissors smart contracts
 *
 * @see https://hardhat.org/config
 */

require('@nomicfoundation/hardhat-toolbox');
require('@fhevm/hardhat-plugin');
require('dotenv').config({ path: '../.env' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.24', // Required for @fhevm/solidity
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'cancun', // Use Cancun EVM version
    },
  },

  networks: {
    // Sepolia testnet configuration
    sepolia: {
      url: process.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: 'auto',
      gas: 'auto',
    },

    // Local hardhat network for testing
    hardhat: {
      chainId: 31337,
    },
  },

  // Etherscan verification configuration
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || '',
    },
  },

  // Path configuration
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },

  // TypeChain configuration for type-safe contract interactions
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
};
