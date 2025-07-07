/**
 * Test script for block height API and countdown timer logic
 * Tests the new real block height functionality
 * 
 * Usage: npm run execute scripts/test-block-height.ts
 */

import { ContractEventsService } from '../src/lib/events';

const contractId = 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR.spare-tomato-pelican';

async function testBlockHeight() {
  console.log('🧪 Testing Block Height API and Countdown Logic');
  console.log('═'.repeat(60));
  console.log(`📍 Contract: ${contractId}`);
  console.log('');

  try {
    // Create events service for testnet
    const eventsService = new ContractEventsService('testnet', contractId);

    // Test 1: Get current block height
    console.log('🔄 TEST 1: Fetching Current Block Height');
    console.log('─'.repeat(40));
    
    const startTime1 = Date.now();
    const currentBlock = await eventsService.getCurrentBlockHeight();
    const duration1 = Date.now() - startTime1;
    
    console.log(`✅ Current block height: ${currentBlock}`);
    console.log(`⏱️  API call duration: ${duration1}ms`);
    console.log('');

    // Test 2: Cached retrieval (should be much faster)
    console.log('🔄 TEST 2: Cached Block Height Retrieval');
    console.log('─'.repeat(40));
    
    const startTime2 = Date.now();
    const cachedBlock = await eventsService.getCurrentBlockHeight();
    const duration2 = Date.now() - startTime2;
    
    console.log(`✅ Cached block height: ${cachedBlock}`);
    console.log(`⏱️  Cached retrieval duration: ${duration2}ms`);
    console.log(`📊 Speed improvement: ${Math.round(duration1 / Math.max(duration2, 1))}x faster`);
    console.log(`🔍 Values match: ${currentBlock === cachedBlock ? 'Yes' : 'No'}`);
    console.log('');

    // Test 3: User analytics with real block heights
    console.log('🔄 TEST 3: User Analytics with Real Block Heights');
    console.log('─'.repeat(40));
    
    // Use a test address that has claimed before
    const testAddress = 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR';
    
    const startTime3 = Date.now();
    const userAnalytics = await eventsService.getUserAnalytics(testAddress);
    const duration3 = Date.now() - startTime3;
    
    if (userAnalytics) {
      console.log(`✅ User analytics retrieved in ${duration3}ms`);
      console.log(`👤 Address: ${userAnalytics.address}`);
      console.log(`💰 Total Claims: ${userAnalytics.totalClaims}`);
      console.log(`🔥 Current Streak: ${userAnalytics.currentStreak}`);
      console.log(`📦 Last Claim Block: ${userAnalytics.lastClaimBlock}`);
      console.log(`⏰ Can Claim Now: ${userAnalytics.canClaimNow}`);
      
      if (userAnalytics.nextClaimTime) {
        const timeUntilClaim = Math.max(0, Math.floor((userAnalytics.nextClaimTime.getTime() - Date.now()) / 1000));
        console.log(`⏳ Time Until Next Claim: ${timeUntilClaim} seconds`);
        console.log(`📅 Next Claim Time: ${userAnalytics.nextClaimTime.toISOString()}`);
        
        // Calculate the countdown based on real block progression
        const blocksUntilClaim = Math.ceil(timeUntilClaim / 5); // 5 seconds per block
        const expectedNextBlock = currentBlock + blocksUntilClaim;
        console.log(`📊 Blocks until claim: ${blocksUntilClaim}`);
        console.log(`🎯 Expected claim block: ${expectedNextBlock}`);
      } else {
        console.log(`✅ User can claim immediately!`);
      }
    } else {
      console.log(`ℹ️  No analytics found for address ${testAddress}`);
    }
    console.log('');

    // Test 4: Block progression calculation
    console.log('🔄 TEST 4: Block Progression Calculation');
    console.log('─'.repeat(40));
    
    const cooldownBlocks = 17280; // 24 hours worth of blocks
    const fiveMinutesInBlocks = Math.floor(5 * 60 / 5); // 5 minutes in blocks
    const oneHourInBlocks = Math.floor(60 * 60 / 5); // 1 hour in blocks
    
    console.log(`📊 Cooldown period: ${cooldownBlocks} blocks (~24 hours)`);
    console.log(`📊 5 minutes: ${fiveMinutesInBlocks} blocks`);
    console.log(`📊 1 hour: ${oneHourInBlocks} blocks`);
    console.log(`📊 Current block: ${currentBlock}`);
    
    // Simulate different claim scenarios
    const recentClaimBlock = currentBlock - 100; // Claimed 100 blocks ago
    const oldClaimBlock = currentBlock - cooldownBlocks - 100; // Can claim now
    
    console.log('');
    console.log('🎯 SIMULATION: Recent Claim (100 blocks ago)');
    const blocksUntilNextClaim = cooldownBlocks - (currentBlock - recentClaimBlock);
    const hoursUntilNextClaim = (blocksUntilNextClaim * 5) / 3600;
    console.log(`   📦 Blocks until next claim: ${blocksUntilNextClaim}`);
    console.log(`   ⏰ Hours until next claim: ${hoursUntilNextClaim.toFixed(2)}`);
    
    console.log('🎯 SIMULATION: Old Claim (can claim now)');
    const blocksUntilOldClaim = cooldownBlocks - (currentBlock - oldClaimBlock);
    console.log(`   📦 Blocks since claim: ${currentBlock - oldClaimBlock}`);
    console.log(`   ✅ Can claim: ${blocksUntilOldClaim <= 0 ? 'Yes' : 'No'}`);
    
    console.log('');
    console.log('✅ Block height and countdown logic tests completed!');

  } catch (error) {
    console.error('❌ Error testing block height:', error);
    process.exit(1);
  }
}

testBlockHeight();