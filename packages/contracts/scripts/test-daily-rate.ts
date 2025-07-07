/**
 * Test script for daily rate calculation
 * Tests the new event-based daily rate calculation logic
 * 
 * Usage: npm run execute scripts/test-daily-rate.ts
 */

import { ContractEventsService } from '../src/lib/events';

const contractId = 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR.spare-tomato-pelican';

async function testDailyRateCalculation() {
  console.log('🧪 Testing Daily Rate Calculation');
  console.log('═'.repeat(60));
  console.log(`📍 Contract: ${contractId}`);
  console.log('');

  try {
    // Create events service for testnet
    const eventsService = new ContractEventsService('testnet', contractId);

    console.log('🔄 Fetching global analytics with calculated daily rate...');
    const globalAnalytics = await eventsService.getGlobalAnalytics();

    console.log('✅ Global Analytics Retrieved');
    console.log('─'.repeat(60));
    
    // Display basic stats
    console.log(`📦 Total Claims:     ${globalAnalytics.totalClaims}`);
    console.log(`💰 Total Claimed:    ${(globalAnalytics.totalClaimed / 1_000_000).toFixed(1)}M tokens`);
    console.log(`🏦 Total Deposited:  ${(globalAnalytics.totalDeposited / 1_000_000).toFixed(1)}M tokens`);
    console.log(`👥 Unique Users:     ${globalAnalytics.totalUsers}`);
    console.log('');

    // Display daily rate calculation results
    console.log('📊 DAILY RATE CALCULATION');
    console.log('─'.repeat(60));
    console.log(`💵 Calculated Daily Rate: ${(globalAnalytics.calculatedDailyRate / 1_000_000).toFixed(1)}M tokens/day`);
    console.log(`🔍 Calculation Method:    ${globalAnalytics.dailyRateMethod}`);
    console.log(`📈 Data Confidence:       ${globalAnalytics.dataConfidence}`);
    console.log(`📅 Period Used:           ${globalAnalytics.ratePeriodDays} days`);
    console.log('');

    // Explain the method used
    console.log('🔬 METHOD EXPLANATION');
    console.log('─'.repeat(60));
    
    switch (globalAnalytics.dailyRateMethod) {
      case 'recent_7day':
        console.log('✅ Using 7-day recent activity (highest accuracy)');
        console.log('   • Based on claims from last 7 days');
        console.log('   • Best for predicting near-term usage');
        break;
        
      case 'recent_30day':
        console.log('📊 Using 30-day recent activity (good accuracy)');
        console.log('   • Based on claims from last 30 days');
        console.log('   • Good balance of recency and sample size');
        break;
        
      case 'historical':
        console.log('📜 Using all-time historical average (lower accuracy)');
        console.log('   • Based on all claims since contract start');
        console.log('   • May not reflect current usage patterns');
        break;
        
      case 'fallback':
        console.log('⚠️  Using fallback constant (750M/day)');
        console.log('   • No sufficient claim data available');
        console.log('   • Using predetermined estimate');
        break;
    }
    
    console.log('');

    // Calculate depletion estimate
    const testBalance = 8_550_000_000; // Example remaining balance
    const estimatedDays = testBalance / globalAnalytics.calculatedDailyRate;
    
    console.log('📅 DEPLETION ESTIMATE');
    console.log('─'.repeat(60));
    console.log(`🏦 Test Balance:      ${(testBalance / 1_000_000_000).toFixed(1)}B tokens`);
    console.log(`⏱️  Estimated Days:    ${estimatedDays.toFixed(1)} days`);
    console.log(`📆 Estimated Date:    ${new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000).toLocaleDateString()}`);
    
    console.log('\n✅ Daily rate calculation test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing daily rate calculation:', error);
    process.exit(1);
  }
}

testDailyRateCalculation();