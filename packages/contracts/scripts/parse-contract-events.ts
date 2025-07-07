/**
 * Script to parse and decode contract event hex data
 * Fetches events and decodes the hex values to readable format
 * 
 * Usage: npm run execute scripts/parse-contract-events.ts
 */

import { cvToJSON, hexToCV } from '@stacks/transactions';

const contractId = 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR.spare-tomato-pelican';
const apiUrl = `https://api.testnet.hiro.so/extended/v1/contract/${contractId}/events`;

console.log('='.repeat(80));
console.log('🔍 Parsing Contract Events');
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
  console.log(`📦 Found ${data.results.length} events`);
  console.log('');
  
  // Parse each event
  data.results.forEach((event: any, index: number) => {
    console.log('='.repeat(60));
    console.log(`📋 Event ${index + 1}/${data.results.length}`);
    console.log('='.repeat(60));
    
    console.log(`🔗 Transaction ID: ${event.tx_id}`);
    console.log(`📍 Event Index: ${event.event_index}`);
    console.log(`🏷️  Event Type: ${event.event_type}`);
    console.log('');
    
    if (event.event_type === 'smart_contract_log' && event.contract_log) {
      const contractLog = event.contract_log;
      
      console.log(`📝 Contract ID: ${contractLog.contract_id}`);
      console.log(`🏷️  Topic: ${contractLog.topic}`);
      console.log('');
      
      // Show raw hex
      console.log('🔢 Raw Hex:');
      console.log(contractLog.value.hex);
      console.log('');
      
      // Show provided repr
      console.log('📖 Provided Repr:');
      console.log(contractLog.value.repr);
      console.log('');
      
      try {
        // Decode hex to Clarity value
        console.log('🔓 Decoding Hex...');
        const clarityValue = hexToCV(contractLog.value.hex);
        
        // Convert to JSON for easier reading
        const jsonValue = cvToJSON(clarityValue);
        
        console.log('✅ Decoded JSON:');
        console.log(JSON.stringify(jsonValue, null, 2));
        console.log('');
        
        // Try to identify event type and show relevant info
        if (jsonValue && typeof jsonValue === 'object' && jsonValue.value) {
          const eventData = jsonValue.value;
          
          if (eventData.event && eventData.event.value) {
            const eventType = eventData.event.value;
            console.log(`🎯 Event Type: ${eventType}`);
            
            switch (eventType) {
              case 'claim':
                console.log('💰 Claim Event Details:');
                console.log(`   👤 User: ${eventData.user?.value || 'N/A'}`);
                console.log(`   💵 Amount: ${eventData.amount?.value || 'N/A'} tokens`);
                console.log(`   🔥 Streak: ${eventData.streak?.value || 'N/A'} days`);
                console.log(`   📊 Total Claims: ${eventData['total-claims']?.value || 'N/A'}`);
                console.log(`   🧱 Block: ${eventData.block?.value || 'N/A'}`);
                break;
                
              case 'deposit':
                console.log('🏦 Deposit Event Details:');
                console.log(`   👤 Depositor: ${eventData.depositor?.value || 'N/A'}`);
                console.log(`   💵 Amount: ${eventData.amount?.value || 'N/A'} tokens`);
                console.log(`   🧱 Block: ${eventData.block?.value || 'N/A'}`);
                break;
                
              case 'streak_milestone':
                console.log('🏆 Streak Milestone Event Details:');
                console.log(`   👤 User: ${eventData.user?.value || 'N/A'}`);
                console.log(`   🔥 Streak: ${eventData.streak?.value || 'N/A'} days`);
                console.log(`   🎖️  Tier: ${eventData.tier?.value || 'N/A'}`);
                break;
                
              default:
                console.log(`❓ Unknown event type: ${eventType}`);
            }
            console.log('');
          }
        }
        
      } catch (decodeError) {
        console.error('❌ Failed to decode hex:');
        console.error(decodeError);
        console.log('');
      }
    }
  });
  
  console.log('='.repeat(80));
  console.log('✅ Event parsing completed!');
  
} catch (error) {
  console.error('❌ Error fetching/parsing contract events:');
  console.error(error);
  process.exit(1);
}