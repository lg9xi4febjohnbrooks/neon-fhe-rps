/**
 * Verify RockPaperArena Contract on Etherscan
 *
 * This script verifies the deployed contract on Etherscan
 * to make the source code publicly available
 */

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n🔍 Starting contract verification...\n');

  // Read latest deployment info
  const latestPath = path.join(__dirname, '../deployments/latest-sepolia.json');

  if (!fs.existsSync(latestPath)) {
    throw new Error('❌ No deployment found. Please deploy contract first.');
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
  const contractAddress = deploymentInfo.contractAddress;

  console.log('📝 Contract address:', contractAddress);
  console.log('📝 Network:', deploymentInfo.network);

  // Check if Etherscan API key is set
  if (!process.env.ETHERSCAN_API_KEY) {
    console.log('⚠️  ETHERSCAN_API_KEY not set in .env file');
    console.log('⚠️  Verification will be skipped');
    console.log('⚠️  Add ETHERSCAN_API_KEY to .env to enable verification\n');
    return;
  }

  try {
    console.log('\n⏳ Verifying contract on Etherscan...');
    console.log('This may take a few minutes...\n');

    // Verify contract
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: [], // RockPaperArena has no constructor arguments
      contract: 'contracts/RockPaperArena.sol:RockPaperArena',
    });

    console.log('✅ Contract verified successfully!\n');

    // Update deployment info with verification status
    deploymentInfo.verified = true;
    deploymentInfo.verifiedAt = new Date().toISOString();
    deploymentInfo.etherscanUrl = `https://sepolia.etherscan.io/address/${contractAddress}#code`;

    fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Verification Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('View on Etherscan:', deploymentInfo.etherscanUrl);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log('✅ Contract is already verified!\n');

      deploymentInfo.verified = true;
      deploymentInfo.etherscanUrl = `https://sepolia.etherscan.io/address/${contractAddress}#code`;
      fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

      console.log('View on Etherscan:', deploymentInfo.etherscanUrl);
    } else {
      console.error('❌ Verification failed:', error.message);
      throw error;
    }
  }
}

// Execute verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Verification error:', error);
    process.exit(1);
  });
