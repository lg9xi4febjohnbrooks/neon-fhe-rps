/**
 * Wagmi & RainbowKit Configuration
 *
 * Configures Web3 wallet connection with RainbowKit UI
 * Coinbase connector is disabled to avoid connection issues
 *
 * @see https://wagmi.sh
 * @see https://rainbowkit.com
 */

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  walletConnectWallet,
  injectedWallet,
  rainbowWallet,
  trustWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';

/**
 * Configure wallet connectors
 * Coinbase Wallet is explicitly excluded to avoid connection issues
 */
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
    {
      groupName: 'Others',
      wallets: [
        rainbowWallet,
        trustWallet,
      ],
    },
  ],
  {
    appName: 'RockPaperFHE',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  }
);

/**
 * Wagmi configuration for Sepolia testnet
 * Includes MetaMask, WalletConnect, and other popular wallets
 * Coinbase connector is explicitly disabled
 */
export const wagmiConfig = createConfig({
  connectors,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: false,
});

/**
 * Sepolia testnet configuration
 */
export const SEPOLIA_CONFIG = {
  chainId: 11155111,
  chainName: 'Sepolia',
  rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io',
} as const;

/**
 * Contract address (deployed on Sepolia)
 */
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0xdb333D6eB967Ae90dEBCF2359E2FA55d3B9A9F26';
