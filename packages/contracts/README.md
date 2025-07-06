# Tropical Blue Bonobo Token Contracts

A comprehensive suite of Clarity smart contracts demonstrating SIP-10 token functionality, faucet mechanics, and batch transfer capabilities on the Stacks blockchain.

## Contracts Overview

### Core Contracts

#### 1. **Token Contract** (`src/clarity/token.clar`)
- **SIP-10 compliant fungible token** with full standard implementation
- **Features**: Transfer, balance checking, metadata, total supply management
- **Supply**: 9 billion tokens with 0 decimals
- **Metadata**: Base64-encoded JSON with token image and description

#### 2. **Token Faucet** (`src/clarity/token-faucet.clar`)
- **Daily claim mechanics** with 24-hour cooldown periods
- **Streak-based rewards** (4 tiers: 50M, 75M, 100M, 125M tokens)
- **Global supply management** with distribution tracking
- **Anti-abuse mechanisms** with rate limiting

#### 3. **Batch Transfer** (`src/clarity/token-batch-transfer.clar`)
- **Multi-recipient transfers** (up to 200 recipients per transaction)
- **Atomic operations** (all transfers succeed or all fail)
- **Memo support** for individual transfers
- **Gas-optimized** using fold/map operations

### TypeScript Integration

#### Contract Wrappers (`src/lib/`)
- **`tropical-blue-bonobo.ts`**: Main token contract wrapper with caching
- **`tbb-faucet.ts`**: Faucet contract wrapper with mock data simulation
- **`tbb-batch-transfer.ts`**: Batch transfer utilities and validation
- **`serializers.ts`**: localStorage serialization with BigInt support
- **`validators.ts`**: Address and input validation utilities

#### Key Features
- **Persistent caching** with localStorage and TTL support
- **Network isolation** (separate mainnet/testnet caches)
- **BigInt serialization** for blockchain-native number handling
- **Type safety** with comprehensive TypeScript interfaces
- **Error handling** with graceful fallbacks

## Quick Start

### Prerequisites
- **Clarinet** for contract development and testing
- **Node.js >=18** for TypeScript integration
- **pnpm** for package management

### Installation
```bash
# Install dependencies
pnpm install

# Run contract tests
pnpm test

# Generate test coverage and cost analysis
pnpm test:report
```

### Development Commands
```bash
# Contract testing
pnpm test              # Run all tests
pnpm test:watch        # Run tests in watch mode
pnpm test:report       # Run with coverage and costs
pnpm build             # Build contract package
pnpm check-types       # TypeScript type checking
pnpm lint              # Run ESLint

# Clarinet commands
clarinet console       # Interactive contract testing
clarinet test          # Run contract tests
clarinet check         # Check contract syntax
```

## Contract Testing

### Automated Tests
- **Basic unit tests** for core contract functions using Vitest
- **Clarinet SDK integration** for simnet testing environment
- **Cost analysis** available via test runner options
- **Coverage reporting** available via test runner options

### Test Structure
```
tests/
├── index.ts                # Test exports
├── token.test.ts           # Basic token contract tests
├── token-faucet.test.ts    # Basic faucet functionality test
└── batch-transfer.test.ts  # Basic batch transfer test
```

### Running Tests
```bash
# Run all tests with coverage
pnpm test:report

# Run specific test file
vitest tests/token.test.ts

# Watch mode for development
pnpm test:watch
```

## Clarinet Console CLI Cheat Sheet

The Clarinet Console is an interactive environment for testing and interacting with your Clarity smart contracts. While it supports special `::` style commands for managing accounts, blocks, and the environment, you can also run any valid Clarity expression directly in the console—including calling functions on contracts you've deployed.

Use the `::` commands for tasks like setting the transaction sender, minting STX, or advancing the chain tip. For contract interaction, simply enter Clarity expressions or contract calls as you would in your code.

---

### Basic Commands

| Command                          | Description                                    |
|----------------------------------|------------------------------------------------|
| `::help`                         | Display all available commands                 |
| `::get_assets_maps`              | Show assets maps for active accounts           |
| `::set_tx_sender <principal>`    | Set `tx-sender` to a principal                 |
| `::mint_stx <principal> <amount>`| Mint STX for a given principal                 |
| `::get_contracts`                | List loaded contracts                          |
| `::get_block_height`             | Show current block height                      |
| `::get_epoch`                    | Show current epoch                             |

---

## Contract Interaction Examples

### Basic Token Operations

#### Transfer 1 token to a new address

Copy and paste each step into the Clarinet Console to test a contract call:

1. Check the initial balance of the transaction sender:
```clojure
(contract-call? .token get-balance tx-sender)
```

2. Show the assets map for all active accounts:
```clojure
::get_assets_maps
```

3. Transfer 1 token from the transaction sender to another principal:
```clojure
(contract-call? .token transfer u1 tx-sender 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 none)
```

4. Check the new balance of the transaction sender:
```clojure
(contract-call? .token get-balance tx-sender)
```

5. Show the assets map again to see the updated balances after the transfer:
```clojure
::get_assets_maps
```

6. Check the new balance of the transaction recipient:
```clojure
(contract-call? .token get-balance 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)
```

#### Faucet Operations

Test the faucet contract functionality:

1. **Check initial faucet status**:
```clojure
(contract-call? .token-faucet get-claim-data tx-sender)
```

2. **Claim tokens from faucet**:
```clojure
(contract-call? .token-faucet claim-tokens)
```

3. **Check updated balance after claim**:
```clojure
(contract-call? .token get-balance tx-sender)
```

4. **Try to claim again (should fail due to cooldown)**:
```clojure
(contract-call? .token-faucet claim-tokens)
```

#### Batch Transfer Operations

Test sending tokens to multiple recipients:

1. **Set up multiple recipients**:
```clojure
(contract-call? .token-batch-transfer send-many 
  (list 
    { to: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5, amount: u1000000, memo: none }
    { to: 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR, amount: u2000000, memo: (some 0x48656c6c6f) }
  ))
```

2. **Check all balances after batch transfer**:
```clojure
(contract-call? .token get-balance 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)
(contract-call? .token get-balance 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR)
```

#### Token Metadata and Information

Explore token properties:

1. **Get token name and symbol**:
```clojure
(contract-call? .token get-name)
(contract-call? .token get-symbol)
```

2. **Get token URI and decode metadata**:
```clojure
(contract-call? .token get-token-uri)
```

3. **Check total supply**:
```clojure
(contract-call? .token get-total-supply)
```

#### Error Testing

Test error conditions:

1. **Transfer more tokens than balance**:
```clojure
(contract-call? .token transfer u999999999999 tx-sender 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 none)
```

2. **Transfer to invalid address** (should fail validation):
```clojure
(contract-call? .token transfer u1 tx-sender 'INVALID_ADDRESS none)
```

3. **Claim from faucet too frequently**:
```clojure
;; Claim once
(contract-call? .token-faucet claim-tokens)
;; Try to claim again immediately (should fail)
(contract-call? .token-faucet claim-tokens)
```

---

**Tip:** You can use the commands above to interact with your contracts, transfer tokens, set transaction senders, and more—all from the Clarinet Console.

## TypeScript Integration Examples

### Using Contract Wrappers

```typescript
import { tropicalBlueBonoboToken } from './src/lib/tropical-blue-bonobo';
import { tbbFaucetContract } from './src/lib/tbb-faucet';

// Get token information
const tokenInfo = await tropicalBlueBonoboToken.getTokenInfo();
console.log('Token:', tokenInfo.name, tokenInfo.symbol);

// Check balance
const balance = await tropicalBlueBonoboToken.getBalance('ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5');
console.log('Balance:', balance.toString());

// Get faucet claim info
const claimInfo = await tbbFaucetContract.getClaimInfo('ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5');
console.log('Can claim:', claimInfo.canClaimNow);
```

### Cache Management

```typescript
// Clear all caches
tropicalBlueBonoboToken.clearCache();
tbbFaucetContract.clearCache();

// Clear specific balance cache
tropicalBlueBonoboToken.clearBalanceCache('ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5');

// Get cache statistics
const stats = tbbFaucetContract.getCacheStats();
console.log('Cache entries:', stats.totalEntries);
```

## Advanced Commands

| Command                                         | Description                                                      |
|-------------------------------------------------|------------------------------------------------------------------|
| `::functions`                                   | List all native functions in Clarity                             |
| `::keywords`                                    | List all native keywords in Clarity                              |
| `::describe <function> \| <keyword>`            | Show documentation for a function or keyword                     |
| `::toggle_costs`                                | Toggle cost analysis after every expression                      |
| `::toggle_timings`                              | Toggle execution duration display                                |
| `::advance_chain_tip <count>`                   | Simulate mining `<count>` blocks                                 |
| `::advance_stacks_chain_tip <count>`            | Simulate mining `<count>` Stacks blocks                          |
| `::advance_burn_chain_tip <count>`              | Simulate mining `<count>` burnchain blocks                       |
| `::set_epoch <epoch>`                           | Set the current epoch                                            |
| `::debug <expr>`                                | Start interactive debug session for `<expr>`                     |
| `::trace <expr>`                                | Generate execution trace for `<expr>`                            |
| `::get_costs <expr>`                            | Display cost analysis for `<expr>`                               |
| `::reload`                                      | Reload existing contract(s)                                      |
| `::read <filename>`                             | Read and execute expressions from a file                         |
| `::encode <expr>`                               | Encode an expression to Clarity Value bytes                      |
| `::decode <bytes>`                              | Decode Clarity Value bytes to an expression                      |

---

## Project Structure

```
packages/contracts/
├── src/
│   ├── clarity/                    # Clarity smart contracts
│   │   ├── token.clar             # Main SIP-10 token contract
│   │   ├── token-faucet.clar      # Faucet contract with daily claims
│   │   └── token-batch-transfer.clar # Batch transfer contract
│   └── lib/                       # TypeScript contract wrappers
│       ├── tropical-blue-bonobo.ts # Main token wrapper
│       ├── tbb-faucet.ts          # Faucet wrapper with caching
│       ├── tbb-batch-transfer.ts  # Batch transfer utilities
│       ├── serializers.ts         # localStorage utilities
│       └── validators.ts          # Input validation
├── tests/                         # Contract test suites
│   ├── token.test.ts             # Token contract tests
│   ├── token-faucet.test.ts      # Faucet tests
│   └── batch-transfer.test.ts    # Batch transfer tests
├── Clarinet.toml                 # Clarinet configuration
├── vitest.config.js              # Test configuration
└── package.json                  # Package dependencies
```

## Contract Deployment

### Testnet Deployment
```bash
# Deploy to testnet
clarinet deployments generate --devnet

# Apply deployment
clarinet deployments apply --devnet
```

### Mainnet Deployment
```bash
# Generate mainnet deployment plan
clarinet deployments generate --mainnet

# Review deployment costs and requirements
clarinet deployments apply --mainnet --dry-run

# Apply to mainnet (requires sufficient STX)
clarinet deployments apply --mainnet
```

### Contract Addresses
- **Testnet**: `ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR`
- **Mainnet**: `SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS`

## Performance Optimization

### Gas Cost Analysis
```bash
# Analyze transaction costs
clarinet console
::toggle_costs
(contract-call? .token transfer u1000000 tx-sender 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 none)
```

### Cache Configuration
- **Static data** (name, symbol): 1 hour TTL
- **Dynamic data** (balances): 30 seconds TTL
- **User data** (faucet claims): 1 minute TTL
- **Global stats**: 30 seconds TTL

### Best Practices
- **Batch operations** for multiple transfers
- **Cache validation** after state-changing operations
- **Error handling** with graceful degradation
- **Network isolation** for testing vs production

## Troubleshooting

### Common Issues

#### Contract Deployment Failures
- **Insufficient STX**: Ensure deployer has enough STX for deployment costs
- **Syntax errors**: Run `clarinet check` to validate contract syntax
- **Network issues**: Verify connection to Stacks network

#### Test Failures
- **Clarinet version**: Ensure compatible Clarinet version (>=2.0)
- **Dependencies**: Run `pnpm install` to update dependencies
- **Cache issues**: Clear test caches with `clarinet clean`

#### TypeScript Integration
- **BigInt serialization**: Use provided serializers for localStorage
- **Network switching**: Clear caches when changing networks
- **Type errors**: Run `pnpm check-types` for TypeScript validation

### Debug Commands
```bash
# Check contract syntax
clarinet check

# Clean project state
clarinet clean

# Verbose test output
clarinet test --verbose

# Debug specific contract
clarinet console
::debug (contract-call? .token get-balance tx-sender)
```

## Contributing

### Development Workflow
1. **Clone repository** and install dependencies
2. **Write tests** for new functionality
3. **Implement contracts** with proper error handling
4. **Test thoroughly** with automated and manual testing
5. **Update documentation** for new features
6. **Submit pull request** with comprehensive description

### Code Standards
- **Clarity best practices** for contract development
- **TypeScript strict mode** for wrapper development
- **Comprehensive testing** for all functionality
- **Clear documentation** for public APIs
- **Gas optimization** for production deployment

---