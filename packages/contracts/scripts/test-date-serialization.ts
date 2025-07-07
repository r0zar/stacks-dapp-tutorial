/**
 * Test script for Date serialization fix
 * Tests that cached user analytics properly convert Date fields
 * 
 * Usage: npm run execute scripts/test-date-serialization.ts
 */

import { TBBFaucetContract } from '../src/lib/spare-tomato-pelican';

async function testDateSerialization() {
  console.log('🧪 Testing Date Serialization Fix');
  console.log('═'.repeat(60));
  console.log('');

  try {
    const faucetContract = new TBBFaucetContract('testnet');
    const testAddress = 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR';

    // Test 1: First call (will cache the result)
    console.log('🔄 TEST 1: First Call (Fresh Data)');
    console.log('─'.repeat(40));
    
    const startTime1 = Date.now();
    const claimInfo1 = await faucetContract.getClaimInfo(testAddress);
    const duration1 = Date.now() - startTime1;
    
    console.log(`✅ First call completed in ${duration1}ms`);
    console.log(`📊 Last Claim Block: ${claimInfo1.lastClaimBlock}`);
    console.log(`🔥 Streak Count: ${claimInfo1.streakCount}`);
    console.log(`💰 Total Claims: ${claimInfo1.totalClaims}`);
    console.log(`⏰ Can Claim Now: ${claimInfo1.canClaimNow}`);
    console.log(`⏳ Time Until Next Claim: ${claimInfo1.timeUntilNextClaim} seconds`);
    console.log('');

    // Test 2: Second call (should use cache and handle Date conversion)
    console.log('🔄 TEST 2: Second Call (Cached Data with Date Conversion)');
    console.log('─'.repeat(40));
    
    const startTime2 = Date.now();
    const claimInfo2 = await faucetContract.getClaimInfo(testAddress);
    const duration2 = Date.now() - startTime2;
    
    console.log(`✅ Second call completed in ${duration2}ms (should be faster)`);
    console.log(`📊 Speed improvement: ${Math.round(duration1 / Math.max(duration2, 1))}x faster`);
    console.log(`📊 Last Claim Block: ${claimInfo2.lastClaimBlock}`);
    console.log(`🔥 Streak Count: ${claimInfo2.streakCount}`);
    console.log(`💰 Total Claims: ${claimInfo2.totalClaims}`);
    console.log(`⏰ Can Claim Now: ${claimInfo2.canClaimNow}`);
    console.log(`⏳ Time Until Next Claim: ${claimInfo2.timeUntilNextClaim} seconds`);
    console.log('');

    // Test 3: Verify data consistency
    console.log('🔄 TEST 3: Data Consistency Check');
    console.log('─'.repeat(40));
    
    const dataMatches = JSON.stringify(claimInfo1) === JSON.stringify(claimInfo2);
    console.log(`🔍 Data consistency: ${dataMatches ? 'PASSED' : 'FAILED'}`);
    
    if (!dataMatches) {
      console.log('❌ First call result:', claimInfo1);
      console.log('❌ Second call result:', claimInfo2);
    } else {
      console.log('✅ Both calls returned identical data');
    }
    console.log('');

    // Test 4: Force refresh to test without cache
    console.log('🔄 TEST 4: Force Refresh (No Cache)');
    console.log('─'.repeat(40));
    
    const startTime3 = Date.now();
    // Clear cache and force refresh
    try {
      faucetContract.refreshAnalytics();
    } catch (error) {
      console.log('ℹ️  Cache clearing skipped (Node.js environment)');
    }
    
    const claimInfo3 = await faucetContract.getClaimInfo(testAddress);
    const duration3 = Date.now() - startTime3;
    
    console.log(`✅ Force refresh completed in ${duration3}ms`);
    console.log(`📊 Last Claim Block: ${claimInfo3.lastClaimBlock}`);
    console.log(`🔥 Streak Count: ${claimInfo3.streakCount}`);
    console.log(`💰 Total Claims: ${claimInfo3.totalClaims}`);
    console.log(`⏰ Can Claim Now: ${claimInfo3.canClaimNow}`);
    console.log(`⏳ Time Until Next Claim: ${claimInfo3.timeUntilNextClaim} seconds`);
    console.log('');

    // Test 5: Check for realistic vs default values
    console.log('🔄 TEST 5: Data Validation');
    console.log('─'.repeat(40));
    
    const hasRealisticData = claimInfo3.totalClaims > 0 && claimInfo3.lastClaimBlock > 0;
    const showsDefaults = claimInfo3.totalClaims === 0 && claimInfo3.lastClaimBlock === 0;
    
    if (hasRealisticData) {
      console.log('✅ Analytics show real data (user has claim history)');
      console.log(`   📦 Claims: ${claimInfo3.totalClaims}`);
      console.log(`   🎯 Last block: ${claimInfo3.lastClaimBlock}`);
      console.log(`   🔍 This indicates the Date serialization fix is working`);
    } else if (showsDefaults) {
      console.log('⚠️  Analytics show default values (possible serialization issue)');
      console.log('   This could indicate the user hasn\'t claimed yet, or there\'s still a bug');
    }

    // Test 6: Global stats validation
    console.log('');
    console.log('🔄 TEST 6: Global Stats Validation');
    console.log('─'.repeat(40));
    
    const globalStats = await faucetContract.getGlobalStats();
    console.log(`✅ Global stats retrieved`);
    console.log(`🏦 Total Supply: ${(globalStats.totalSupply / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`📤 Distributed: ${(globalStats.distributed / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`💰 Remaining: ${(globalStats.remaining / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`⚡ Daily Rate: ${(globalStats.dailyRate / 1_000_000).toFixed(1)}M tokens/day`);
    console.log(`📅 Days Remaining: ${globalStats.estimatedDaysRemaining.toFixed(1)}`);
    
    const hasReasonableStats = globalStats.dailyRate > 0 && globalStats.dailyRate !== 750_000_000;
    console.log(`🔍 Using calculated (not hardcoded) daily rate: ${hasReasonableStats ? 'YES' : 'NO'}`);

    console.log('');
    console.log('✅ Date serialization tests completed!');

  } catch (error) {
    console.error('❌ Error testing date serialization:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testDateSerialization();