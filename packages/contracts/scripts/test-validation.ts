/**
 * Test script to debug address validation issues
 */

import { TBBBatchTransferContract } from '../src/lib/available-purple-squid';
import { isValidStacksAddress } from '../src/lib/validators';

// Test addresses
const testAddresses = [
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Valid testnet
  'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Valid mainnet 
  'invalid-address', // Invalid
  '', // Empty
  'ST', // Too short
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM123456789', // Too long
];

console.log('🧪 Testing Address Validation\n');

const batchTransferContract = new TBBBatchTransferContract('testnet');

testAddresses.forEach((address, index) => {
  console.log(`Test ${index + 1}: "${address}"`);
  
  // Test direct validator
  const directValid = isValidStacksAddress(address);
  console.log(`  Direct validator: ${directValid ? '✅ Valid' : '❌ Invalid'}`);
  
  // Test contract validation
  const contractValidation = batchTransferContract.validateRecipients([{
    address,
    amount: 1000000
  }]);
  
  const result = contractValidation[0];
  console.log(`  Contract validator: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
  if (!result.isValid && result.error) {
    console.log(`  Error: ${result.error}`);
  }
  
  console.log('');
});

console.log('🏁 Testing complete!');