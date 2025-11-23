/**
 * Export Contract ABI for Frontend Integration
 *
 * This script exports the contract ABI to the frontend src directory
 * for easy integration with ethers.js/viem
 */

const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n📦 Exporting contract ABI...\n');

  // Read compiled contract artifact
  const artifactPath = path.join(
    __dirname,
    '../artifacts/contracts/RockPaperArena.sol/RockPaperArena.json'
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      '❌ Contract artifact not found. Please compile contract first with: npm run compile'
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  // Create ABI export object
  const abiExport = {
    contractName: 'RockPaperArena',
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    exportedAt: new Date().toISOString(),
  };

  // Export to frontend src/contracts directory
  const frontendContractsDir = path.join(__dirname, '../../src/contracts');

  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  // Save as JSON
  const jsonPath = path.join(frontendContractsDir, 'RockPaperArena.json');
  fs.writeFileSync(jsonPath, JSON.stringify(abiExport, null, 2));

  console.log('✅ ABI exported to:', jsonPath);

  // Save as TypeScript module
  const tsContent = `/**
 * RockPaperArena Contract ABI
 * Auto-generated from compiled contract
 * Do not edit manually
 */

export const RockPaperArenaABI = ${JSON.stringify(artifact.abi, null, 2)} as const;

export const RockPaperArenaBytecode = '${artifact.bytecode}' as const;

export type RockPaperArenaABI = typeof RockPaperArenaABI;
`;

  const tsPath = path.join(frontendContractsDir, 'RockPaperArena.ts');
  fs.writeFileSync(tsPath, tsContent);

  console.log('✅ TypeScript ABI exported to:', tsPath);

  // Read deployment info if exists
  const deploymentPath = path.join(__dirname, '../deployments/latest-sepolia.json');

  if (fs.existsSync(deploymentPath)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

    // Export contract config
    const configContent = `/**
 * Contract Configuration
 * Auto-generated from deployment
 */

export const CONTRACT_CONFIG = {
  address: '${deployment.contractAddress}',
  chainId: ${deployment.chainId},
  network: '${deployment.network}',
  deployedAt: '${deployment.deployedAt}',
  verified: ${deployment.verified || false},
  etherscanUrl: '${deployment.etherscanUrl || ''}',
} as const;
`;

    const configPath = path.join(frontendContractsDir, 'config.ts');
    fs.writeFileSync(configPath, configContent);

    console.log('✅ Contract config exported to:', configPath);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 ABI Export Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Contract:', deployment.contractName);
    console.log('Address:', deployment.contractAddress);
    console.log('Network:', deployment.network);
    console.log('Chain ID:', deployment.chainId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } else {
    console.log('\n⚠️  No deployment found. Contract address not included in export.');
    console.log('Deploy contract first with: npm run deploy:sepolia\n');
  }

  console.log('📋 Next steps:');
  console.log('1. Import ABI in frontend: import { RockPaperArenaABI } from "@/contracts/RockPaperArena"');
  console.log('2. Use with wagmi/viem for contract interactions\n');
}

// Execute export
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  });
