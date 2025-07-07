/**
 * Clean contract events parser with better formatting
 * Fetches events and displays them in a clean, organized format
 * 
 * Usage: npm run execute scripts/parse-events-clean.ts
 */

import { cvToJSON, hexToCV } from '@stacks/transactions';

interface ClaimEvent {
  type: 'claim';
  user: string;
  amount: number;
  streak: number;
  totalClaims: number;
  block: number;
  txId: string;
}

interface DepositEvent {
  type: 'deposit';
  depositor: string;
  amount: number;
  block: number;
  txId: string;
}

interface StreakMilestoneEvent {
  type: 'streak_milestone';
  user: string;
  streak: number;
  tier: number;
  txId: string;
}

type ParsedEvent = ClaimEvent | DepositEvent | StreakMilestoneEvent;

const contractId = 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR.spare-tomato-pelican';
const apiUrl = `https://api.testnet.hiro.so/extended/v1/contract/${contractId}/events`;

function parseEvent(rawEvent: any): ParsedEvent | null {
  try {
    if (rawEvent.event_type !== 'smart_contract_log' || !rawEvent.contract_log) {
      return null;
    }

    const hex = rawEvent.contract_log.value.hex;
    const clarityValue = hexToCV(hex);
    const jsonValue = cvToJSON(clarityValue);
    
    if (!jsonValue?.value || typeof jsonValue.value !== 'object') {
      return null;
    }

    const eventData = jsonValue.value;
    const eventType = eventData.event?.value;
    const txId = rawEvent.tx_id;

    switch (eventType) {
      case 'claim':
        return {
          type: 'claim',
          user: eventData.user?.value || '',
          amount: parseInt(eventData.amount?.value || '0'),
          streak: parseInt(eventData.streak?.value || '0'),
          totalClaims: parseInt(eventData['total-claims']?.value || '0'),
          block: parseInt(eventData.block?.value || '0'),
          txId
        };

      case 'deposit':
        return {
          type: 'deposit',
          depositor: eventData.depositor?.value || '',
          amount: parseInt(eventData.amount?.value || '0'),
          block: parseInt(eventData.block?.value || '0'),
          txId
        };

      case 'streak_milestone':
        return {
          type: 'streak_milestone',
          user: eventData.user?.value || '',
          streak: parseInt(eventData.streak?.value || '0'),
          tier: parseInt(eventData.tier?.value || '0'),
          txId
        };

      default:
        return null;
    }
  } catch (error) {
    console.error('Failed to parse event:', error);
    return null;
  }
}

function formatTokenAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B`;
  } else if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K`;
  }
  return amount.toString();
}

function formatAddress(address: string): string {
  if (address.length > 10) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  return address;
}

function displayEvent(event: ParsedEvent, index: number) {
  const header = `Event ${index + 1}: ${event.type.toUpperCase()}`;
  console.log('\n' + '─'.repeat(60));
  console.log(`📋 ${header}`);
  console.log('─'.repeat(60));

  switch (event.type) {
    case 'claim':
      console.log(`👤 User:        ${formatAddress(event.user)}`);
      console.log(`💰 Amount:      ${formatTokenAmount(event.amount)} tokens`);
      console.log(`🔥 Streak:      ${event.streak} days`);
      console.log(`📊 Total Claims: ${event.totalClaims}`);
      console.log(`🧱 Block:       ${event.block.toLocaleString()}`);
      break;

    case 'deposit':
      console.log(`👤 Depositor:   ${formatAddress(event.depositor)}`);
      console.log(`💰 Amount:      ${formatTokenAmount(event.amount)} tokens`);
      console.log(`🧱 Block:       ${event.block.toLocaleString()}`);
      break;

    case 'streak_milestone':
      console.log(`👤 User:        ${formatAddress(event.user)}`);
      console.log(`🔥 Streak:      ${event.streak} days`);
      console.log(`🎖️  Tier:       ${event.tier}`);
      break;
  }
  
  console.log(`🔗 TX:          ${event.txId.slice(0, 10)}...`);
}

async function main() {
  console.log('🔍 Clean Contract Events Parser');
  console.log('═'.repeat(60));
  console.log(`📍 Contract: ${contractId}`);
  console.log('');

  try {
    console.log('🔄 Fetching events...');
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.results.length} raw events`);
    
    // Parse all events
    const parsedEvents: ParsedEvent[] = [];
    for (const rawEvent of data.results) {
      const parsed = parseEvent(rawEvent);
      if (parsed) {
        parsedEvents.push(parsed);
      }
    }

    console.log(`🎯 Parsed ${parsedEvents.length} valid events`);

    // Display each event
    parsedEvents.forEach((event, index) => {
      displayEvent(event, index);
    });

    // Summary statistics
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    
    const claims = parsedEvents.filter(e => e.type === 'claim') as ClaimEvent[];
    const deposits = parsedEvents.filter(e => e.type === 'deposit') as DepositEvent[];
    const milestones = parsedEvents.filter(e => e.type === 'streak_milestone');

    console.log(`📦 Total Events:     ${parsedEvents.length}`);
    console.log(`💰 Claims:           ${claims.length}`);
    console.log(`🏦 Deposits:         ${deposits.length}`);
    console.log(`🏆 Milestones:       ${milestones.length}`);
    
    if (claims.length > 0) {
      const totalClaimed = claims.reduce((sum, claim) => sum + claim.amount, 0);
      console.log(`💸 Total Claimed:    ${formatTokenAmount(totalClaimed)} tokens`);
    }
    
    if (deposits.length > 0) {
      const totalDeposited = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
      console.log(`💵 Total Deposited:  ${formatTokenAmount(totalDeposited)} tokens`);
    }

    const uniqueUsers = new Set([
      ...claims.map(c => c.user),
      ...deposits.map(d => d.depositor),
      ...milestones.map(m => m.user)
    ]).size;
    console.log(`👥 Unique Users:     ${uniqueUsers}`);

    console.log('\n✅ Parsing completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();