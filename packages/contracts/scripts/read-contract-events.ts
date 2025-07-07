/**
 * Simple script to fetch contract events from Stacks API
 * Just logs the raw response to verify the API works correctly
 * 
 * Usage: npm run execute read-contract-events
 */

const contractId = 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR.spare-tomato-pelican';
const apiUrl = `https://api.testnet.hiro.so/extended/v1/contract/${contractId}/events`;

console.log('='.repeat(80));
console.log('📡 Fetching Contract Events');
console.log('='.repeat(80));
console.log(`Contract ID: ${contractId}`);
console.log(`API URL: ${apiUrl}`);
console.log('');

try {
  console.log('🔄 Making API request...');
  const response = await fetch(apiUrl);
  
  console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
  console.log('');
  
  if (!response.ok) {
    console.error('❌ API request failed');
    console.error(`Status: ${response.status}`);
    console.error(`Status Text: ${response.statusText}`);
    process.exit(1);
  }
  
  const data = await response.json();
  
  console.log('✅ API Response received');
  console.log('='.repeat(80));
  console.log('📋 Raw Response Data:');
  console.log('='.repeat(80));
  console.log(JSON.stringify(data, null, 2));
  
} catch (error) {
  console.error('❌ Error fetching contract events:');
  console.error(error);
  process.exit(1);
}