/**
 * Test script for network switching cache isolation
 * Tests that switching between mainnet and testnet doesn't mix up analytics
 * 
 * Usage: npm run execute scripts/test-network-switching.ts
 */

import { TBBFaucetContract } from '../src/lib/spare-tomato-pelican';
import { ContractEventsService } from '../src/lib/events';

async function testNetworkSwitching() {
  console.log('🧪 Testing Network Switching Cache Isolation');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Test addresses for different networks
    const testnetAddress = 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR';
    const mainnetAddress = 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS';

    // Test 1: Testnet Analytics
    console.log('🔄 TEST 1: Testnet Analytics');
    console.log('─'.repeat(40));
    
    const testnetContract = new TBBFaucetContract('testnet');
    
    console.log('📡 Network: testnet');
    console.log(`📍 Contract ID: ${testnetContract.getFaucetContractId()}`);
    
    const testnetStats = await testnetContract.getGlobalStats();
    const testnetClaimInfo = await testnetContract.getClaimInfo(testnetAddress);
    
    console.log(`🏦 Testnet Total Supply: ${(testnetStats.totalSupply / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`💰 Testnet Remaining: ${(testnetStats.remaining / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`⚡ Testnet Daily Rate: ${(testnetStats.dailyRate / 1_000_000).toFixed(1)}M tokens/day`);
    console.log(`📊 Testnet User Claims: ${testnetClaimInfo.totalClaims}`);
    console.log(`📦 Testnet Last Claim Block: ${testnetClaimInfo.lastClaimBlock}`);
    console.log('');

    // Test 2: Mainnet Analytics (should be different)
    console.log('🔄 TEST 2: Mainnet Analytics');
    console.log('─'.repeat(40));
    
    const mainnetContract = new TBBFaucetContract('mainnet');
    
    console.log('📡 Network: mainnet');
    console.log(`📍 Contract ID: ${mainnetContract.getFaucetContractId()}`);
    
    const mainnetStats = await mainnetContract.getGlobalStats();
    const mainnetClaimInfo = await mainnetContract.getClaimInfo(mainnetAddress);
    
    console.log(`🏦 Mainnet Total Supply: ${(mainnetStats.totalSupply / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`💰 Mainnet Remaining: ${(mainnetStats.remaining / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`⚡ Mainnet Daily Rate: ${(mainnetStats.dailyRate / 1_000_000).toFixed(1)}M tokens/day`);
    console.log(`📊 Mainnet User Claims: ${mainnetClaimInfo.totalClaims}`);
    console.log(`📦 Mainnet Last Claim Block: ${mainnetClaimInfo.lastClaimBlock}`);
    console.log('');

    // Test 3: Cross-contamination check
    console.log('🔄 TEST 3: Network Isolation Validation');
    console.log('─'.repeat(40));
    
    const networksIsolated = (
      testnetStats.remaining !== mainnetStats.remaining ||
      testnetStats.dailyRate !== mainnetStats.dailyRate ||
      testnetClaimInfo.lastClaimBlock !== mainnetClaimInfo.lastClaimBlock
    );
    
    console.log(`🔍 Networks properly isolated: ${networksIsolated ? 'YES' : 'NO'}`);
    
    if (!networksIsolated) {
      console.log('⚠️  WARNING: Networks might be sharing cache data!');
      console.log('   This could indicate a cache isolation issue.');
    } else {
      console.log('✅ Networks show different data (good isolation)');
    }
    console.log('');

    // Test 4: Cache prefix validation
    console.log('🔄 TEST 4: Cache Prefix Validation');
    console.log('─'.repeat(40));
    
    const testnetEvents = new ContractEventsService('testnet');
    const mainnetEvents = new ContractEventsService('mainnet');
    
    console.log(`🔑 Testnet cache prefix: "${(testnetEvents as any).cachePrefix}"`);
    console.log(`🔑 Mainnet cache prefix: "${(mainnetEvents as any).cachePrefix}"`);
    
    const prefixesAreDifferent = (testnetEvents as any).cachePrefix !== (mainnetEvents as any).cachePrefix;
    console.log(`🔍 Cache prefixes different: ${prefixesAreDifferent ? 'YES' : 'NO'}`);
    console.log('');

    // Test 5: Contract ID validation
    console.log('🔄 TEST 5: Contract ID Validation');
    console.log('─'.repeat(40));
    
    const testnetContractId = testnetContract.getFaucetContractId();
    const mainnetContractId = mainnetContract.getFaucetContractId();
    
    console.log(`📍 Testnet Contract: ${testnetContractId}`);
    console.log(`📍 Mainnet Contract: ${mainnetContractId}`);
    
    const contractsAreDifferent = testnetContractId !== mainnetContractId;
    console.log(`🔍 Different contracts: ${contractsAreDifferent ? 'YES' : 'NO'}`);
    console.log('');

    // Test 6: Block height comparison
    console.log('🔄 TEST 6: Block Height Comparison');
    console.log('─'.repeat(40));
    
    try {
      const testnetBlockHeight = await testnetEvents.getCurrentBlockHeight();
      const mainnetBlockHeight = await mainnetEvents.getCurrentBlockHeight();
      
      console.log(`📦 Testnet current block: ${testnetBlockHeight}`);
      console.log(`📦 Mainnet current block: ${mainnetBlockHeight}`);
      
      const blockHeightsAreDifferent = testnetBlockHeight !== mainnetBlockHeight;
      console.log(`🔍 Different block heights: ${blockHeightsAreDifferent ? 'YES' : 'NO'}`);
      
      // Testnet and mainnet should have different block heights
      if (blockHeightsAreDifferent) {
        console.log('✅ Networks are fetching from different blockchain APIs');
      } else {
        console.log('⚠️  WARNING: Same block height might indicate API routing issue');
      }
    } catch (error) {
      console.log('⚠️  Could not fetch block heights for comparison:', error.message);
    }
    console.log('');

    // Test 7: Simulated network switch
    console.log('🔄 TEST 7: Simulated Network Switch');
    console.log('─'.repeat(40));
    
    console.log('🧹 Clearing all caches...');
    try {
      testnetContract.clearCache();
      testnetContract.refreshAnalytics();
      mainnetContract.clearCache();
      mainnetContract.refreshAnalytics();
      console.log('✅ Cache clearing completed');
    } catch (error) {
      console.log('⚠️  Cache clearing had issues (expected in Node.js):', error.message);
    }
    
    // Re-fetch after cache clear
    const testnetStatsAfter = await testnetContract.getGlobalStats();
    console.log(`🔄 Testnet stats after cache clear: ${(testnetStatsAfter.remaining / 1_000_000_000).toFixed(1)}B remaining`);
    console.log('');

    console.log('✅ Network switching tests completed!');
    
    // Summary
    console.log('📋 SUMMARY');
    console.log('─'.repeat(40));
    console.log(`✅ Cache prefixes isolated: ${prefixesAreDifferent ? 'YES' : 'NO'}`);
    console.log(`✅ Contract IDs different: ${contractsAreDifferent ? 'YES' : 'NO'}`);
    console.log(`✅ Analytics data isolated: ${networksIsolated ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Error testing network switching:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testNetworkSwitching();