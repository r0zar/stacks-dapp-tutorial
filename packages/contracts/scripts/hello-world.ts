/**
 * Simple test script to verify the execute command works
 */

console.log('Hello from TypeScript script!');
console.log('Script execution is working correctly');

// Example with some basic functionality
const currentTime = new Date().toISOString();
console.log(`Current time: ${currentTime}`);

// Example importing from the project
import { CONTRACT_ERRORS } from '../src/lib/tbb-batch-transfer';

console.log('Available contract errors:');
Object.entries(CONTRACT_ERRORS).forEach(([key, error]) => {
  console.log(`  - ${key}: ${error.message} (code: ${error.code})`);
});

console.log('Script completed successfully!');

// Test with safe Unicode characters
console.log('Testing Unicode: ✓ ✗ → ← ↑ ↓ ★ ◆ ●');