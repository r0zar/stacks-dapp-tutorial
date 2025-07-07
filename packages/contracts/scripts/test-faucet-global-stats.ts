/**
 * Test script for faucet contract global stats
 * Tests the getGlobalStats() method that the frontend calls
 * 
 * Usage: npm run execute scripts/test-faucet-global-stats.ts
 */

import { TBBFaucetContract } from '../src/lib/spare-tomato-pelican';

async function testFaucetGlobalStats() {
  console.log('🧪 Testing Faucet Contract Global Stats');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Create faucet contract instance (testnet)
    const faucetContract = new TBBFaucetContract('testnet');

    console.log('🔄 Fetching global stats from faucet contract...');
    console.log('(This is the same method the frontend calls)');
    console.log('');

    const startTime = Date.now();
    
    // Note: Skipping cache clearing in Node.js environment due to localStorage issues
    console.log('📝 Getting fresh data (cache clearing skipped in Node.js)...');
    console.log('');

    const globalStats = await faucetContract.getGlobalStats();
    const duration = Date.now() - startTime;

    console.log('✅ Global Stats Retrieved from Faucet Contract');
    console.log('─'.repeat(60));
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('');

    // Display the stats that the frontend sees
    console.log('📊 GLOBAL STATS (What Frontend Receives)');
    console.log('─'.repeat(60));
    console.log(`🏦 Total Supply:        ${(globalStats.totalSupply / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`📤 Distributed:         ${(globalStats.distributed / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`💰 Remaining:           ${(globalStats.remaining / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`🎯 Avg Emission Rate:   ${(globalStats.dailyTarget / 1_000_000).toFixed(1)}M tokens/day`);
    console.log(`📅 Est. Days Remaining: ${globalStats.estimatedDaysRemaining.toFixed(1)} days`);
    console.log(`📊 Percentage Remaining: ${globalStats.percentageRemaining.toFixed(1)}%`);
    console.log('');

    // Check if this matches our calculated values
    console.log('🔍 ANALYSIS');
    console.log('─'.repeat(60));
    
    if (globalStats.dailyTarget === 750_000_000) {
      console.log('⚠️  ISSUE FOUND: Emission rate is still the hardcoded 750M!');
      console.log('   This means the events analytics integration is not working.');
      console.log('');
      
      // Let's test the events service directly to see what it's returning
      console.log('🔍 Testing Events Service Directly...');
      
      const eventsService = (faucetContract as any).eventsService;
      const eventAnalytics = await eventsService.getGlobalAnalytics();
      
      console.log(`📊 Events Service Daily Rate: ${(eventAnalytics.calculatedDailyRate / 1_000_000).toFixed(1)}M tokens/day`);
      console.log(`🔍 Events Calculation Method: ${eventAnalytics.dailyRateMethod}`);
      console.log(`📈 Events Data Confidence: ${eventAnalytics.dataConfidence}`);
      console.log('');
      
      if (eventAnalytics.calculatedDailyRate !== globalStats.dailyTarget) {
        console.log('❌ PROBLEM: Events service calculated daily rate does not match faucet global stats!');
        console.log(`   Events: ${eventAnalytics.calculatedDailyRate} vs Faucet: ${globalStats.dailyTarget}`);
      }
      
    } else {
      console.log('✅ Daily Target appears to be calculated (not 750M)');
      console.log(`   Using calculated value: ${(globalStats.dailyTarget / 1_000_000).toFixed(1)}M tokens/day`);
    }

    // Show estimated depletion date
    const depletionDate = new Date(Date.now() + globalStats.estimatedDaysRemaining * 24 * 60 * 60 * 1000);
    console.log(`📅 Estimated Depletion Date: ${depletionDate.toDateString()}`);
    console.log('');

    // Test the formatting functions that frontend uses
    console.log('🎨 FRONTEND FORMATTING TEST');
    console.log('─'.repeat(60));
    
    // These are the same values the frontend would display
    const formattedDailyTarget = `${(globalStats.dailyTarget / 1_000_000).toFixed(1)}M TKN`;
    const formattedDepletion = `${Math.round(globalStats.estimatedDaysRemaining)} days`;
    
    console.log(`Daily Target Display: "${formattedDailyTarget}"`);
    console.log(`Est. Depletion Display: "${formattedDepletion}"`);
    console.log('');

    if (formattedDailyTarget === "750.0M TKN") {
      console.log('❌ This matches the hardcoded value the user is seeing!');
    } else {
      console.log('✅ This should show updated calculated values');
    }

    console.log('✅ Faucet global stats test completed!');

  } catch (error) {
    console.error('❌ Error testing faucet global stats:', error);
    process.exit(1);
  }
}

testFaucetGlobalStats();