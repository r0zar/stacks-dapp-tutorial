/**
 * Test script to simulate the exact UI validation scenario
 */

import { TBBBatchTransferContract } from '../src/lib/available-purple-squid';

console.log('🧪 Testing UI Validation Scenario\n');

const batchTransferContract = new TBBBatchTransferContract('testnet');

// Simulate what happens in the UI when typing an address
const testScenario = (address: string, amount: number) => {
  console.log(`Testing: address="${address}", amount=${amount}`);
  
  const validation = batchTransferContract.validateRecipients([{
    address: address,
    amount: amount
  }]);
  
  const result = validation[0];
  console.log(`  isValid: ${result.isValid}`);
  console.log(`  error: ${result.error || 'none'}`);
  
  return result;
};

// Test scenarios that might occur in the UI
console.log('1. Empty address, no amount:');
testScenario('', 0);

console.log('\n2. Valid address, no amount:');
testScenario('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 0);

console.log('\n3. Valid address, valid amount:');
testScenario('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 1000000);

console.log('\n4. Invalid address, valid amount:');
testScenario('invalid-address', 1000000);

console.log('\n5. Partial address while typing:');
testScenario('ST1PQHQK', 1000000);

console.log('\n6. Valid address, amount below minimum:');
testScenario('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 0.5);

console.log('\n🏁 Testing complete!');