# RockPaperArena Testing Guide

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run test suite
npm test
```

## Test Suite Structure

### Test Files
```
contracts/
├── test/
│   ├── RockPaperArena.test.ts          # Main test suite (71 tests)
│   ├── RockPaperArena.test.js          # Legacy tests (for reference)
│   └── fixtures/
│       └── RockPaperArena.fixture.ts   # Deployment fixtures
└── test-utils/
    ├── instance.ts                      # FHE instance management
    └── signers.ts                       # Signer management
```

## Test Categories

### 1. Unit Tests
Tests individual contract functions in isolation.

**Coverage**:
- ✅ Deployment & Initialization (4 tests)
- ✅ Match Queue Operations (21 tests)
- ✅ State Management (12 tests)
- ✅ View Functions (4 tests)

### 2. Integration Tests
Tests complete user workflows from start to finish.

**Coverage**:
- ⚠️ Full game flows (5 tests - requires testnet)
- ✅ Multi-player scenarios (3 tests)
- ✅ Concurrent matches (2 tests)

### 3. Security Tests
Tests access control, authorization, and attack vectors.

**Coverage**:
- ✅ Access control (6 tests)
- ✅ State validation (8 tests)
- ✅ Edge cases (7 tests)

### 4. FHE Tests
Tests encrypted operations and homomorphic computations.

**Coverage**:
- ⚠️ Encrypted move submission (7 tests - requires testnet)
- ⚠️ Match reveal logic (8 tests - requires testnet)
- ⚠️ Homomorphic winner calculation (0 tests - requires testnet)

## Running Tests

### All Tests
```bash
npm test
# or
npx hardhat test
```

### Specific Test File
```bash
npx hardhat test test/RockPaperArena.test.ts
```

### TypeScript Tests Only
```bash
npx hardhat test test/RockPaperArena.test.ts
```

### Legacy Tests Only
```bash
npx hardhat test test/RockPaperArena.test.js
```

### With Gas Reporting
```bash
REPORT_GAS=true npm test
```

### With Coverage
```bash
npm run coverage
```

## Test Results (Local Environment)

```
RockPaperArena - Comprehensive Test Suite
  ✅ 47 passing (744ms)
  ⚠️  24 failing (FHE operations - requires testnet)
```

### Passing Tests (47)
- Deployment & Initialization: 4/4 ✅
- Match Queue: 21/21 ✅
- State Management: 12/12 ✅
- View Functions: 4/4 ✅
- Edge Cases: 6/6 ✅

### Failing Tests (24) - Requires Testnet
- FHE Move Submission: 0/7 ⚠️
- Match Reveal: 0/8 ⚠️
- Integration Flows: 0/5 ⚠️
- FHE Security: 0/4 ⚠️

**Why Failed**: Mock FHE instances cannot generate valid encrypted data for contract validation. These tests require deployment to Zama's Sepolia testnet with full KMS infrastructure.

## Testing on Sepolia Testnet

### Prerequisites
1. Configure `.env` file:
```bash
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=your_sepolia_rpc_url
ETHERSCAN_API_KEY=your_etherscan_api_key
```

2. Deploy contract:
```bash
npm run deploy:sepolia
```

3. Run tests on testnet:
```bash
npm run test:sepolia
```

### Expected Results on Testnet
```
RockPaperArena - Comprehensive Test Suite
  ✅ 71 passing
  ❌ 0 failing
```

## Test Utilities

### FHE Instance Management

```typescript
import { createInstances, createInstance } from "../test-utils/instance";

// Create instances for all test signers
const instances = await createInstances(contractAddress, ethers, signers);

// Use instance to encrypt data
const instance = instances.player1;
const input = instance.createEncryptedInput(contractAddress, player1Address);
input.add8(0); // Add Rock (0)
const encrypted = await input.encrypt();
```

### Signer Management

```typescript
import { initSigners, getSigners, getSigner } from "../test-utils/signers";

// Initialize signers
await initSigners();

// Get all signers
const signers = getSigners();
const player1 = signers.player1;

// Get specific signer
const owner = getSigner("owner");
```

### Test Fixtures

```typescript
import {
  deployRockPaperArenaFixture,
  deployWithWaitingMatch,
  deployWithActiveMatch
} from "./fixtures/RockPaperArena.fixture";

// Basic deployment
const { rockPaperArena, owner, player1, player2 } =
  await deployRockPaperArenaFixture();

// Deploy with match already created
const { rockPaperArena, matchId } = await deployWithWaitingMatch();

// Deploy with both players joined
const { rockPaperArena, matchId } = await deployWithActiveMatch();
```

## Writing New Tests

### Test Template

```typescript
describe("Feature Name", function () {
  let rockPaperArena: RockPaperArena;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;

  beforeEach(async function () {
    const deployment = await deployRockPaperArenaFixture();
    rockPaperArena = deployment.rockPaperArena;
    player1 = deployment.player1;
    player2 = deployment.player2;
  });

  it("Should do something", async function () {
    // Arrange
    const initialState = await rockPaperArena.someState();

    // Act
    await rockPaperArena.connect(player1).someFunction();

    // Assert
    const newState = await rockPaperArena.someState();
    expect(newState).to.not.equal(initialState);
  });
});
```

### FHE Test Template

```typescript
it("Should submit encrypted move", async function () {
  // Create match
  await rockPaperArena.connect(player1).createChallenge();
  await rockPaperArena.connect(player2).acceptChallenge(1);

  // Encrypt move
  const instance = instances.player1;
  const input = instance.createEncryptedInput(
    await rockPaperArena.getAddress(),
    player1.address
  );
  input.add8(0); // Rock
  const encrypted = await input.encrypt();

  // Submit move
  await expect(
    rockPaperArena
      .connect(player1)
      .submitMove(1, encrypted.handles[0], encrypted.inputProof)
  ).to.emit(rockPaperArena, "MoveCommitted");
});
```

## Debugging Tests

### Enable Verbose Logging
```bash
DEBUG=* npm test
```

### Run Single Test
```typescript
it.only("Should test specific case", async function () {
  // This test will run alone
});
```

### Skip Test
```typescript
it.skip("Should test later", async function () {
  // This test will be skipped
});
```

### Check Contract State
```typescript
// Log contract state during test
console.log("Match:", await rockPaperArena.getMatch(1));
console.log("Pending:", await rockPaperArena.getPendingMatches());
console.log("Stats:", await rockPaperArena.getPlayerStats(player1.address));
```

## Common Issues

### Issue 1: FHE Instance Creation Fails
```
Error: KMS contract address is not valid or empty
```

**Solution**: This is expected in local environment. Tests use mock instances automatically. For real FHE testing, deploy to Sepolia testnet.

### Issue 2: InvalidType() Error
```
Error: VM Exception while processing transaction: reverted with custom error 'InvalidType()'
```

**Solution**: Mock encrypted data cannot pass contract validation. Deploy to testnet for full FHE testing.

### Issue 3: Gas Limit Exceeded
```
Error: Transaction ran out of gas
```

**Solution**: Increase gas limit in hardhat.config.ts or optimize contract code.

### Issue 4: Nonce Too Low
```
Error: nonce has already been used
```

**Solution**: Reset Hardhat network:
```bash
npx hardhat clean
npm test
```

## Best Practices

### 1. Test Isolation
- ✅ Use `beforeEach` for fresh contract deployment
- ✅ Don't rely on test execution order
- ✅ Clean up state after tests

### 2. Clear Test Names
```typescript
// ✅ Good
it("Should revert if player already in a match", async () => {});

// ❌ Bad
it("Test 1", async () => {});
```

### 3. Arrange-Act-Assert Pattern
```typescript
it("Should create match", async () => {
  // Arrange
  const initialCounter = await rockPaperArena.matchCounter();

  // Act
  await rockPaperArena.connect(player1).createChallenge();

  // Assert
  expect(await rockPaperArena.matchCounter()).to.equal(initialCounter + 1n);
});
```

### 4. Test Edge Cases
```typescript
// ✅ Test normal case
it("Should accept valid match ID", async () => {});

// ✅ Test edge cases
it("Should revert if match ID is zero", async () => {});
it("Should revert if match ID exceeds counter", async () => {});
```

### 5. Use Custom Errors
```typescript
// ✅ Good
await expect(tx).to.be.revertedWithCustomError(contract, "AlreadyInMatch");

// ❌ Bad
await expect(tx).to.be.reverted;
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run compile
      - run: npm test
      - run: npm run coverage
```

## Test Coverage Goals

### Current Coverage
- **Overall**: 66% (47/71 tests passing in local env)
- **Business Logic**: 100% ✅
- **Access Control**: 100% ✅
- **State Management**: 100% ✅
- **FHE Operations**: 0% (requires testnet) ⚠️

### Target Coverage (After Testnet Testing)
- **Overall**: 100% ✅
- **Business Logic**: 100% ✅
- **Access Control**: 100% ✅
- **State Management**: 100% ✅
- **FHE Operations**: 100% ✅

## Resources

- [Hardhat Testing Guide](https://hardhat.org/tutorial/testing-contracts)
- [Chai Matchers Documentation](https://hardhat.org/hardhat-chai-matchers/docs/overview)
- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [TypeChain Documentation](https://github.com/dethcrypto/TypeChain)

## Support

For test-related issues:
1. Check [TEST_REPORT.md](TEST_REPORT.md) for known issues
2. Review [Hardhat Documentation](https://hardhat.org/docs)
3. Check Zama Discord for FHE-specific questions

---

**Last Updated**: 2025-11-20
**Test Framework**: Hardhat v2.26.0 + Mocha + Chai
**TypeScript**: 5.8.3
**fhEVM**: 0.9.1
