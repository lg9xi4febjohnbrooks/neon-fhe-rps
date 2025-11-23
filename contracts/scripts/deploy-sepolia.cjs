/**
 * Deploy RockPaperArena to Sepolia Testnet
 *
 * This script deploys the RockPaperArena contract to Sepolia
 * and saves the deployment information for frontend integration
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n🚀 Starting RockPaperArena deployment to Sepolia...\n');

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log('📝 Deploying with account:', deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('💰 Account balance:', hre.ethers.formatEther(balance), 'ETH\n');

  if (balance === 0n) {
    throw new Error('❌ Insufficient balance. Please fund your account with Sepolia ETH.');
  }

  // Deploy RockPaperArena
  console.log('📦 Deploying RockPaperArena contract...');
  const RockPaperArena = await hre.ethers.getContractFactory('RockPaperArena');
  const contract = await RockPaperArena.deploy();

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log('✅ RockPaperArena deployed to:', contractAddress);

  // Wait for a few block confirmations
  console.log('\n⏳ Waiting for 5 block confirmations...');
  await contract.deploymentTransaction().wait(5);
  console.log('✅ Deployment confirmed!\n');

  // Save deployment info
  const deploymentInfo = {
    contractName: 'RockPaperArena',
    contractAddress: contractAddress,
    deployer: deployer.address,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `sepolia-${Date.now()}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  // Save latest deployment
  const latestPath = path.join(deploymentsDir, 'latest-sepolia.json');
  fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

  console.log('📄 Deployment info saved to:', deploymentPath);
  console.log('📄 Latest deployment saved to:', latestPath);

  // Update .env file with contract address
  const envPath = path.join(__dirname, '../../.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add CONTRACT_ADDRESS
  if (envContent.includes('VITE_CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(
      /VITE_CONTRACT_ADDRESS=.*/,
      `VITE_CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nVITE_CONTRACT_ADDRESS=${contractAddress}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env file with contract address\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Deployment Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Contract:', deploymentInfo.contractName);
  console.log('Address:', deploymentInfo.contractAddress);
  console.log('Network:', deploymentInfo.network);
  console.log('Chain ID:', deploymentInfo.chainId);
  console.log('Deployer:', deploymentInfo.deployer);
  console.log('Block:', deploymentInfo.blockNumber);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 Next steps:');
  console.log('1. Verify contract: npm run verify:sepolia');
  console.log('2. Export ABI: npm run export-abi');
  console.log('3. Test frontend integration\n');

  return contractAddress;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
