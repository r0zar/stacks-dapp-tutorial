# Scripts Directory

This directory contains example scripts and utilities for working with the smart contracts.

## Files

### `batch-transfer-example.ts`

Comprehensive examples demonstrating how to use the `TBBBatchTransferContract` TypeScript wrapper for batch token transfers.

**Features demonstrated:**
- Creating batch transfer requests
- Validating recipients and requests
- Generating batch summaries and fee calculations
- CSV parsing for bulk uploads
- Executing real contract calls via Stacks Connect
- Individual transfer execution
- Error handling and explorer URL generation

**Usage:**

```typescript
import { 
  exampleBatchTransfer, 
  exampleCSVParsing, 
  exampleIndividualTransfer 
} from './batch-transfer-example';

// Run examples
await exampleBatchTransfer();
exampleCSVParsing();
await exampleIndividualTransfer();
```

**Prerequisites:**
- Stacks wallet browser extension installed and configured
- Test STX and tokens available on testnet
- Network connection to Stacks blockchain

## Running Scripts

### Using the Execute Command

The package includes a custom `execute` script that runs TypeScript files with automatic timestamped logging:

```bash
# From the contracts package root
pnpm execute scripts/<script-name>.ts

# Examples:
pnpm execute scripts/hello-world.ts
pnpm execute scripts/batch-transfer-example.ts
```

**Features:**
- ✅ Automatic timestamped log files in `logs/` directory
- ✅ Comprehensive execution metadata (user, platform, Node version, etc.)
- ✅ Real-time output display and logging
- ✅ Execution summary with duration and log file info
- ✅ Error handling and exit code reporting

**Log Files:**
All script executions are automatically logged to:
```
logs/YYYYMMDD-HHMMSS-<script-name>.log
```

Example log file: `logs/20250706-180803-hello-world.log`

### Direct Bash Script Execution

You can also run the bash script directly:

```bash
# From the contracts package root
./execute.sh scripts/hello-world.ts
```

### Prerequisites

To run these scripts, ensure you have:

1. All dependencies installed (`pnpm install`)
2. For wallet interaction scripts: Stacks Connect properly configured
3. For mainnet scripts: Real STX and tokens available
4. For testnet scripts: Test STX and tokens available

### Manual Execution (No Logging)

For quick testing without logging, you can run scripts directly:

```bash
# From the contracts package root
npx tsx scripts/batch-transfer-example.ts
```

### Viewing Logs

To view recent execution logs:

```bash
# List all log files
ls -la logs/

# View the latest log
tail -f logs/$(ls -t logs/ | head -1)

# View a specific log
cat logs/20250706-180803-hello-world.log
```

## Note

These scripts are for educational and testing purposes. Always verify contract addresses and test on testnet before using on mainnet.