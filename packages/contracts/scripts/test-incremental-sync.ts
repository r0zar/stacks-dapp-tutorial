/**
 * Test script for incremental sync functionality
 * Tests the new incremental pagination and sync state tracking
 * 
 * Usage: npm run execute scripts/test-incremental-sync.ts
 */

import { ContractEventsService } from '../src/lib/events';

const contractId = 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR.spare-tomato-pelican';

async function testIncrementalSync() {
  console.log('🧪 Testing Incremental Sync Functionality');
  console.log('═'.repeat(60));
  console.log(`📍 Contract: ${contractId}`);
  console.log('');

  try {
    // Create fresh events service
    const eventsService = new ContractEventsService('testnet', contractId);

    // Clear cache to start fresh
    console.log('🧹 Clearing cache to start fresh...');
    eventsService.clearCache();
    console.log('');

    // Test 1: Initial full sync
    console.log('🔄 TEST 1: Initial Full Sync');
    console.log('─'.repeat(40));
    
    const startTime1 = Date.now();
    const events1 = await eventsService.syncEvents(true); // Force refresh
    const duration1 = Date.now() - startTime1;
    
    console.log(`✅ Initial sync complete:`);
    console.log(`   📦 Events found: ${events1.length}`);
    console.log(`   ⏱️  Duration: ${duration1}ms`);
    console.log('');

    // Test 2: Cached retrieval
    console.log('🔄 TEST 2: Cached Retrieval');
    console.log('─'.repeat(40));
    
    const startTime2 = Date.now();
    const events2 = await eventsService.syncEvents(false); // Use cache
    const duration2 = Date.now() - startTime2;
    
    console.log(`✅ Cached retrieval complete:`);
    console.log(`   📦 Events returned: ${events2.length}`);
    console.log(`   ⏱️  Duration: ${duration2}ms (should be much faster)`);
    console.log(`   📊 Speed improvement: ${Math.round(duration1 / Math.max(duration2, 1))}x faster`);
    console.log('');

    // Test 3: Force refresh to test incremental logic
    console.log('🔄 TEST 3: Force Refresh (Test Incremental Logic)');
    console.log('─'.repeat(40));
    
    const startTime3 = Date.now();
    const events3 = await eventsService.syncEvents(true); // Force refresh again
    const duration3 = Date.now() - startTime3;
    
    console.log(`✅ Force refresh complete:`);
    console.log(`   📦 Events found: ${events3.length}`);
    console.log(`   ⏱️  Duration: ${duration3}ms`);
    console.log('');

    // Test 4: Check sync state
    console.log('🔍 TEST 4: Sync State Analysis');
    console.log('─'.repeat(40));
    
    // Access private method via type assertion for testing
    const syncStateMethod = (eventsService as any).getSyncState.bind(eventsService);
    const syncState = syncStateMethod();
    
    console.log(`📊 Current Sync State:`);
    console.log(`   🔢 Last processed block: ${syncState.lastProcessedBlock}`);
    console.log(`   📅 Last sync: ${syncState.lastSyncTimestamp.toISOString()}`);
    console.log(`   📦 Total events parsed: ${syncState.totalEventsParsed}`);
    console.log(`   🔗 Last processed TX: ${syncState.lastProcessedTxId.substring(0, 10)}...`);
    console.log(`   📞 Total API calls: ${syncState.totalAPICallsMade}`);
    console.log(`   ✅ Fully synced: ${syncState.isFullySynced}`);
    console.log(`   📄 Last offset: ${syncState.lastOffset}`);
    console.log('');

    // Test 5: Validate event data integrity
    console.log('🔍 TEST 5: Event Data Validation');
    console.log('─'.repeat(40));
    
    const claimEvents = events3.filter(e => e.type === 'claim');
    const depositEvents = events3.filter(e => e.type === 'deposit');
    const milestoneEvents = events3.filter(e => e.type === 'streak_milestone');
    
    console.log(`📊 Event Types Found:`);
    console.log(`   💰 Claim events: ${claimEvents.length}`);
    console.log(`   🏦 Deposit events: ${depositEvents.length}`);
    console.log(`   🏆 Milestone events: ${milestoneEvents.length}`);
    console.log('');

    // Test claim event details
    if (claimEvents.length > 0) {
      const recentClaim = claimEvents[0];
      console.log(`🔍 Most Recent Claim Event:`);
      console.log(`   👤 User: ${recentClaim.user}`);
      console.log(`   💰 Amount: ${(recentClaim.amount / 1_000_000).toFixed(1)}M tokens`);
      console.log(`   🔥 Streak: ${recentClaim.streak}`);
      console.log(`   📦 Block: ${recentClaim.block}`);
      console.log(`   🆔 TX ID: ${recentClaim.txId.substring(0, 16)}...`);
      console.log('');
    }

    // Test 6: Performance comparison
    console.log('📊 PERFORMANCE SUMMARY');
    console.log('─'.repeat(40));
    console.log(`⚡ Initial sync: ${duration1}ms`);
    console.log(`💨 Cached retrieval: ${duration2}ms`);
    console.log(`🔄 Force refresh: ${duration3}ms`);
    console.log('');

    // Test 7: Cache efficiency
    const cacheStats = eventsService.getCacheStats();
    console.log(`🗄️  CACHE STATISTICS`);
    console.log('─'.repeat(40));
    console.log(`📁 Total cache entries: ${cacheStats.totalEntries}`);
    console.log(`🔑 Cache keys: ${cacheStats.cacheKeys.join(', ')}`);
    console.log('');

    console.log('✅ All incremental sync tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing incremental sync:', error);
    process.exit(1);
  }
}

testIncrementalSync();