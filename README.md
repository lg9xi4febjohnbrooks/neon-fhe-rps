# RockPaperFHE - Encrypted Rock Paper Scissors Arena

A provably fair Rock Paper Scissors game built with Fully Homomorphic Encryption (FHE) technology, ensuring complete move privacy until reveal.

## 🌐 Live Demo

**Play Now**: [https://rockpaperfhe.vercel.app](https://rockpaperfhe.vercel.app)

**Contract**: `0x6F0ded5A8a3507F2A21D02AC0cf84228d91Ed73e` ([View on Etherscan](https://sepolia.etherscan.io/address/0x6F0ded5A8a3507F2A21D02AC0cf84228d91Ed73e))

## 🎯 Overview

RockPaperFHE brings the classic game on-chain with instant matches and encrypted move commitments. Players submit encrypted moves, and reveals occur only after both sides commit, preventing front-running and preserving suspense.

## ✨ Key Features

- **🔒 FHE Encryption**: All moves are encrypted using Fully Homomorphic Encryption before submission
- **⚡ Instant Matching**: Real-time opponent pairing system
- **🛡️ Zero Knowledge**: Provably fair outcomes with no information leakage
- **🎮 Arcade Theme**: Retro neon aesthetic with pixel-perfect UI
- **📊 Leaderboard**: Track wins, losses, and streaks

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.11.1
- npm or bun
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH

### Installation

```bash
# Install frontend dependencies
npm install

# Install contract dependencies
cd contracts
npm install
cd ..
```

### Environment Setup

Create a `.env` file:

```env
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_CONTRACT_ADDRESS=0x6F0ded5A8a3507F2A21D02AC0cf84228d91Ed73e
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Development

```bash
# Start frontend
npm run dev

# Compile contracts
cd contracts && npm run compile

# Run tests
npm test

# Deploy to Sepolia
npm run deploy:sepolia
```

## 📦 Technology Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Web3**: Wagmi + RainbowKit
- **FHE**: @zama-fhe/relayer-sdk@0.2.0
- **Contracts**: Solidity 0.8.24 + @fhevm/solidity@^0.8.0
- **UI**: ShadcnUI + Tailwind CSS

## 🎮 How to Play

1. Connect your Web3 wallet
2. Create or join a match
3. Select your gesture (Rock/Paper/Scissors)
4. Submit encrypted move
5. Wait for opponent
6. Reveal results

## 🔐 FHE Implementation

All player moves are encrypted client-side before submission:

```typescript
// Encrypt gesture (0=Rock, 1=Paper, 2=Scissors)
const { handle, inputProof } = await encryptUint8(
  gesture,
  contractAddress,
  userAddress
);

// Submit to contract
await contract.submitMove(matchId, handle, inputProof);
```

## 📁 Project Structure

```
13_RockPaperFHE/
├── contracts/              # Smart contracts
│   ├── contracts/RockPaperArena.sol
│   ├── scripts/           # Deploy & verify scripts
│   └── test/              # Contract tests
├── src/                    # Frontend source
│   ├── components/        # React components
│   ├── contracts/         # Generated ABIs
│   ├── hooks/             # Custom hooks
│   ├── pages/             # Route pages
│   └── utils/             # FHE utilities
└── docs/                  # Documentation
```

## 🧪 Testing

```bash
# Contract tests
cd contracts && npm test

# 19 passing tests covering:
# - Match creation and joining
# - Move submission
# - Winner determination
# - Gas optimization
```

## 🐛 Troubleshooting

### FHE Initialization
- Check COOP/COEP headers in vite.config.ts
- Use CDN dynamic import method
- Clear browser cache

### Contract Deployment
- Ensure Sepolia ETH balance
- Verify RPC URL connectivity
- Check private key format

## 📚 Documentation

- [Frontend Development Guide](./docs/FRONTEND_DEV.md)
- [Backend Development Guide](./docs/BACKEND_DEV.md)
- [Complete FHE Guide](../../docs/FHE_COMPLETE_GUIDE_FULL_CN.md)

## 🎯 Roadmap

- [x] Basic match creation and joining
- [x] FHE encrypted move submission
- [x] Winner determination with homomorphic operations
- [ ] Gateway integration for result decryption
- [ ] Token rewards and staking
- [ ] Tournament system
- [ ] NFT achievements
- [ ] Mobile PWA version

## 📄 License

MIT License

## 🙏 Acknowledgments

- **Zama** - FHE technology and fhEVM
- **RainbowKit** - Wallet connection UI
- **ShadcnUI** - UI components

---

**Built with ❤️ using Fully Homomorphic Encryption**

*Play with confidence. Your moves remain private.*
