/**
 * Example usage of the TBBBatchTransferContract wrapper
 * This demonstrates how to use the TypeScript wrapper with real contract calls
 */

import { TBBBatchTransferContract, BatchTransferRequest, BatchTransferRecipient } from '../src/lib/tbb-batch-transfer';

// Example usage function
export async function exampleBatchTransfer() {
    // Create contract instance for testnet
    const batchTransferContract = new TBBBatchTransferContract('testnet');

    // Example recipients list
    const recipients: BatchTransferRecipient[] = [
        {
            address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
            amount: 1000000 // 1M tokens
        },
        {
            address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
            amount: 2500000 // 2.5M tokens
        },
        {
            address: 'ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ',
            amount: 500000 // 0.5M tokens
        }
    ];

    // Create batch transfer request
    const request: BatchTransferRequest = {
        recipients,
        sender: 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR', // Your wallet address
        memo: 'Batch transfer example'
    };

    console.log('=== Batch Transfer Example ===');

    // 1. Validate recipients individually
    console.log('\n1. Validating recipients...');
    const validations = batchTransferContract.validateRecipients(recipients);
    validations.forEach((validation, index) => {
        console.log(`Recipient ${index + 1}: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
        if (!validation.isValid) {
            console.log(`   Error: ${validation.error}`);
        }
    });

    // 2. Validate the complete batch request
    console.log('\n2. Validating batch request...');
    const batchValidation = batchTransferContract.validateBatchRequest(request);
    if (batchValidation.isValid) {
        console.log('✅ Batch request is valid');
    } else {
        console.log('❌ Batch request has errors:');
        batchValidation.errors.forEach(error => console.log(`   - ${error}`));
        return; // Don't proceed if validation fails
    }

    // 3. Generate batch summary
    console.log('\n3. Batch summary...');
    const summary = batchTransferContract.generateBatchSummary(recipients);
    console.log(`Total recipients: ${summary.totalRecipients}`);
    console.log(`Total amount: ${summary.totalAmount} tokens`);
    console.log(`Average amount: ${summary.averageAmount} tokens`);
    console.log(`Largest transfer: ${summary.largestTransfer} tokens`);
    console.log(`Smallest transfer: ${summary.smallestTransfer} tokens`);

    // 4. Calculate fees
    console.log('\n4. Fee calculation...');
    const estimatedFee = batchTransferContract.getBatchTransferFee(recipients.length);
    console.log(`Estimated transaction fee: ${estimatedFee} STX`);

    // 5. Prepare contract call data
    console.log('\n5. Preparing contract call...');
    const prepared = batchTransferContract.prepareBatchTransfer(request);
    console.log(`Contract ID: ${prepared.contractId}`);
    console.log(`Function: ${prepared.functionName}`);
    console.log(`Arguments prepared: ${prepared.functionArgs.length} args`);

    // 6. Get contract information
    console.log('\n6. Contract information...');
    const contractInfo = batchTransferContract.getContractInfo();
    console.log(`Network: ${contractInfo.network}`);
    console.log(`Batch Transfer Contract: ${contractInfo.batchTransferContractId}`);
    console.log(`Token Contract: ${contractInfo.tokenContractId}`);
    console.log(`Max recipients: ${contractInfo.maxRecipients}`);

    // 7. Get explorer URLs
    console.log('\n7. Explorer URLs...');
    console.log(`Batch Transfer Contract: ${batchTransferContract.getBatchTransferContractUrl()}`);
    console.log(`Token Contract: ${batchTransferContract.getTokenContractUrl()}`);

    // 8. Execute the batch transfer (this will prompt the user's wallet)
    console.log('\n8. Executing batch transfer...');
    console.log('⚠️ This will open your Stacks wallet for approval');
    
    try {
        const result = await batchTransferContract.executeBatchTransfer(request);
        
        if (result.success) {
            console.log('✅ Batch transfer submitted successfully!');
            console.log(`Transaction ID: ${result.txId}`);
            console.log(`Explorer: ${batchTransferContract.getTransactionUrl(result.txId)}`);
        } else {
            console.log('❌ Batch transfer failed:');
            console.log(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Example CSV parsing
export function exampleCSVParsing() {
    const batchTransferContract = new TBBBatchTransferContract('testnet');

    console.log('\n=== CSV Parsing Example ===');

    // Example CSV data
    const csvData = `address,amount
ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM,1000000
ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG,2500000
invalid-address,1000000
ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ,0
ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5,500000`;

    const parseResult = batchTransferContract.parseCSVData(csvData);
    
    console.log(`Valid recipients: ${parseResult.validCount}`);
    console.log(`Invalid recipients: ${parseResult.invalidCount}`);
    
    if (parseResult.errors.length > 0) {
        console.log('\nErrors found:');
        parseResult.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\nValid recipients:');
    parseResult.recipients.forEach((recipient, index) => {
        console.log(`   ${index + 1}. ${recipient.address}: ${recipient.amount} tokens`);
    });

    // Generate template
    console.log('\nCSV Template:');
    console.log(batchTransferContract.generateCSVTemplate());
}

// Example individual transfer
export async function exampleIndividualTransfer() {
    const batchTransferContract = new TBBBatchTransferContract('testnet');

    console.log('\n=== Individual Transfer Example ===');

    const sender = 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR';
    const recipient = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const amount = 1000000; // 1M tokens
    const memo = 'Individual transfer example';

    try {
        const result = await batchTransferContract.executeTransfer(sender, recipient, amount, memo);
        
        if (result.success) {
            console.log('✅ Transfer submitted successfully!');
            console.log(`Transaction ID: ${result.txId}`);
            console.log(`Explorer: ${batchTransferContract.getTransactionUrl(result.txId)}`);
        } else {
            console.log('❌ Transfer failed:');
            console.log(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Export the contract instances for easy use
export { TBBBatchTransferContract } from '../src/lib/tbb-batch-transfer';
export const batchTransferMainnet = new TBBBatchTransferContract('mainnet');
export const batchTransferTestnet = new TBBBatchTransferContract('testnet');

// Auto-run examples when script is executed directly
async function runExamples() {
    console.log('🎯 Running Batch Transfer Examples...\n');
    
    try {
        // Run CSV parsing example (no wallet interaction needed)
        console.log('1. CSV Parsing Example:');
        console.log('========================');
        exampleCSVParsing();
        
        console.log('\n2. Batch Transfer Validation Example:');
        console.log('=====================================');
        await exampleBatchTransferValidation();
        
        console.log('\n📝 Note: Wallet interaction examples require Stacks Connect setup.');
        console.log('   To test wallet functions, uncomment the lines below:');
        console.log('   // await exampleBatchTransfer();');
        console.log('   // await exampleIndividualTransfer();');
        
    } catch (error) {
        console.error('❌ Error running examples:', error);
    }
}

// New validation-only example (no wallet interaction)
async function exampleBatchTransferValidation() {
    const batchTransferContract = new TBBBatchTransferContract('testnet');

    // Example recipients list
    const recipients = [
        {
            address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
            amount: 1000000 // 1M tokens
        },
        {
            address: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
            amount: 2500000 // 2.5M tokens
        },
        {
            address: 'invalid-address', // This will fail validation
            amount: 500000
        }
    ];

    // Create batch transfer request
    const request = {
        recipients,
        sender: 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR',
        memo: 'Validation test'
    };

    console.log('Validating recipients...');
    const validations = batchTransferContract.validateRecipients(recipients);
    validations.forEach((validation, index) => {
        console.log(`  Recipient ${index + 1}: ${validation.isValid ? '✓ Valid' : '✗ Invalid'}`);
        if (!validation.isValid) {
            console.log(`    Error: ${validation.error}`);
        }
    });

    console.log('\nValidating batch request...');
    const batchValidation = batchTransferContract.validateBatchRequest(request);
    if (batchValidation.isValid) {
        console.log('✓ Batch request is valid');
    } else {
        console.log('✗ Batch request has errors:');
        batchValidation.errors.forEach(error => console.log(`  - ${error}`));
    }

    // Generate summary
    const summary = batchTransferContract.generateBatchSummary(recipients);
    console.log('\nBatch Summary:');
    console.log(`  Total recipients: ${summary.totalRecipients}`);
    console.log(`  Valid recipients: ${summary.validRecipients}`);
    console.log(`  Invalid recipients: ${summary.invalidRecipients}`);
    console.log(`  Total amount: ${summary.totalAmount} tokens`);
    console.log(`  Average amount: ${summary.averageAmount} tokens`);

    // Calculate fees
    const estimatedFee = batchTransferContract.getBatchTransferFee(recipients.length);
    console.log(`  Estimated fee: ${estimatedFee} STX`);

    // Get contract info
    const contractInfo = batchTransferContract.getContractInfo();
    console.log(`\nContract Information:`);
    console.log(`  Network: ${contractInfo.network}`);
    console.log(`  Batch Contract: ${contractInfo.batchTransferContractId}`);
    console.log(`  Token Contract: ${contractInfo.tokenContractId}`);
    console.log(`  Max recipients: ${contractInfo.maxRecipients}`);
}

// Run examples if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runExamples().catch(console.error);
}