/**
 * Contract Events Service
 * Fetches and parses real contract events for analytics
 * 
 * Provides real-time analytics by parsing contract events including:
 * - User claim events and streak tracking
 * - Deposit events for faucet funding
 * - Streak milestone achievements
 */

import { cvToJSON, hexToCV } from '@stacks/transactions';
import { getCacheEntry, setCacheEntry, removeCacheEntriesByPrefix } from './serializers';

// Contract event interfaces (parsed from blockchain events)
export interface ClaimEvent {
  type: 'claim';
  user: string;
  amount: number;
  streak: number;
  totalClaims: number;
  block: number;
  txId: string;
  timestamp?: Date;
}

export interface DepositEvent {
  type: 'deposit';
  depositor: string;
  amount: number;
  block: number;
  txId: string;
  timestamp?: Date;
}

export interface StreakMilestoneEvent {
  type: 'streak_milestone';
  user: string;
  streak: number;
  tier: number;
  txId: string;
  timestamp?: Date;
}

export type ParsedEvent = ClaimEvent | DepositEvent | StreakMilestoneEvent;

// Analytics calculation interfaces
export interface UserAnalytics {
  address: string;
  totalClaims: number;
  totalClaimed: number;
  currentStreak: number;
  maxStreak: number;
  lastClaimBlock: number;
  lastClaimTimestamp?: Date;
  canClaimNow: boolean;
  nextClaimTime?: Date;
  streakMilestones: StreakMilestoneEvent[];
  claimHistory: ClaimEvent[];
}

export interface GlobalAnalytics {
  totalUsers: number;
  totalClaims: number;
  totalClaimed: number;
  totalDeposited: number;
  averageStreak: number;
  longestStreak: number;
  dailyClaimCount: number;
  weeklyClaimCount: number;
  calculatedDailyRate: number;
  dailyRateMethod: 'recent_7day' | 'recent_30day' | 'historical' | 'fallback';
  dataConfidence: 'high' | 'medium' | 'low';
  ratePeriodDays: number;
  lastUpdated: Date;
}

export interface EventSyncState {
  lastProcessedBlock: number;
  lastSyncTimestamp: Date;
  totalEventsParsed: number;
  lastProcessedTxId: string;
  totalAPICallsMade: number;
  isFullySynced: boolean;
  lastOffset: number;
}

type NetworkType = 'mainnet' | 'testnet';

/**
 * Contract Events Service
 * Handles fetching, parsing, and analyzing contract events for real-time analytics
 */
export class ContractEventsService {
  private readonly network: NetworkType;
  private readonly contractId: string;
  private readonly cachePrefix: string;
  private readonly apiUrl: string;

  // Cache TTL constants (in milliseconds)
  private readonly CACHE_TTL = {
    EVENTS: 5 * 60 * 1000,        // 5 minutes - raw events cache
    USER_ANALYTICS: 2 * 60 * 1000, // 2 minutes - user analytics
    GLOBAL_ANALYTICS: 1 * 60 * 1000, // 1 minute - global analytics
    SYNC_STATE: 10 * 60 * 1000,    // 10 minutes - sync metadata
    BLOCK_HEIGHT: 60 * 1000        // 1 minute - current block height
  };

  // Streak tracking constants
  private readonly STREAK_REQUIREMENTS = {
    BLOCKS_PER_DAY: 17280,         // ~24 hours at 5 seconds per block
    MAX_STREAK_GAP: 25920,         // 1.5 days in blocks (allows some flexibility)
    COOLDOWN_BLOCKS: 17280         // 24 hours cooldown between claims
  };

  constructor(network: NetworkType = 'testnet', contractId?: string) {
    this.network = network;
    this.contractId = contractId || (network === 'mainnet' 
      ? 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.spare-tomato-pelican'
      : 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR.spare-tomato-pelican');
    this.cachePrefix = `events-service:${this.network}:`;
    this.apiUrl = `https://api.${network === 'mainnet' ? 'mainnet' : 'testnet'}.hiro.so/extended/v1/contract/${this.contractId}/events`;
  }

  // CACHE MANAGEMENT

  private getCached<T>(key: string): T | null {
    const cacheKey = this.cachePrefix + key;
    return getCacheEntry<T>(cacheKey);
  }

  private setCached<T>(key: string, data: T, ttl: number): void {
    const cacheKey = this.cachePrefix + key;
    setCacheEntry(cacheKey, data, ttl);
  }

  public clearCache(): void {
    removeCacheEntriesByPrefix(this.cachePrefix);
  }

  // SYNC STATE MANAGEMENT

  /**
   * Get current sync state from cache
   */
  private getSyncState(): EventSyncState {
    const cached = this.getCached<EventSyncState>('sync_state');
    if (cached !== null) {
      // Ensure lastSyncTimestamp is a Date object (it may be a string from JSON)
      return {
        ...cached,
        lastSyncTimestamp: new Date(cached.lastSyncTimestamp)
      };
    }

    // Default sync state for first run
    return {
      lastProcessedBlock: 0,
      lastSyncTimestamp: new Date(0),
      totalEventsParsed: 0,
      lastProcessedTxId: '',
      totalAPICallsMade: 0,
      isFullySynced: false,
      lastOffset: 0
    };
  }

  /**
   * Save sync state to cache
   */
  private setSyncState(state: EventSyncState): void {
    this.setCached('sync_state', state, this.CACHE_TTL.SYNC_STATE);
  }

  /**
   * Update sync state after processing events
   */
  private updateSyncState(
    newEvents: ParsedEvent[], 
    apiCallsMade: number, 
    lastOffset: number,
    isFullySynced: boolean
  ): void {
    const currentState = this.getSyncState();
    
    // Find the highest block number from new events
    const maxBlock = newEvents.length > 0 
      ? Math.max(...newEvents.map(e => 'block' in e ? e.block : 0))
      : currentState.lastProcessedBlock;

    // Find the most recent transaction ID
    const mostRecentTxId = newEvents.length > 0 
      ? newEvents[0].txId 
      : currentState.lastProcessedTxId;

    const updatedState: EventSyncState = {
      lastProcessedBlock: Math.max(maxBlock, currentState.lastProcessedBlock),
      lastSyncTimestamp: new Date(),
      totalEventsParsed: currentState.totalEventsParsed + newEvents.length,
      lastProcessedTxId: mostRecentTxId,
      totalAPICallsMade: currentState.totalAPICallsMade + apiCallsMade,
      isFullySynced,
      lastOffset: isFullySynced ? 0 : lastOffset
    };

    this.setSyncState(updatedState);
  }

  // EVENT FETCHING AND PARSING

  /**
   * Fetch raw events from Stacks API with pagination support
   */
  async fetchRawEvents(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const url = `${this.apiUrl}?limit=${limit}&offset=${offset}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return [];
    }
  }

  /**
   * Get current block height from Stacks API
   */
  async getCurrentBlockHeight(): Promise<number> {
    const cacheKey = 'current_block_height';
    
    // Check cache first
    const cached = this.getCached<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const blockApiUrl = `https://api.${this.network === 'mainnet' ? 'mainnet' : 'testnet'}.hiro.so/extended/v1/block?limit=1`;
      const response = await fetch(blockApiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const latestBlock = data.results?.[0];
      
      if (!latestBlock?.height) {
        throw new Error('No block height found in API response');
      }

      const currentHeight = latestBlock.height;
      
      // Cache the result
      this.setCached(cacheKey, currentHeight, this.CACHE_TTL.BLOCK_HEIGHT);
      
      return currentHeight;
    } catch (error) {
      console.error('Failed to fetch current block height:', error);
      
      // Fallback: estimate based on time if we have cached events
      const events = this.getCached<ParsedEvent[]>('parsed_events');
      if (events && events.length > 0) {
        const latestEventBlock = Math.max(...events.map(e => 'block' in e ? e.block : 0));
        if (latestEventBlock > 0) {
          // Estimate current block as latest event + some blocks (conservative)
          const estimatedCurrent = latestEventBlock + 100;
          console.warn(`Using fallback block height estimate: ${estimatedCurrent}`);
          return estimatedCurrent;
        }
      }
      
      // Last resort: return a reasonable default
      console.warn('Using default block height fallback');
      return 1000000; // Reasonable default for current Stacks height
    }
  }

  /**
   * Parse a single raw event into a typed ParsedEvent
   */
  parseEvent(rawEvent: any): ParsedEvent | null {
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

  /**
   * Fetch and parse all events with incremental syncing
   */
  async syncEvents(forceRefresh: boolean = false): Promise<ParsedEvent[]> {
    const cacheKey = 'parsed_events';
    
    // Get current sync state
    const syncState = this.getSyncState();
    
    // Check cache first unless forcing refresh or we need to continue syncing
    if (!forceRefresh && !this.shouldContinueSync(syncState)) {
      const cached = this.getCached<ParsedEvent[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      console.log(`🔄 Starting incremental sync from offset ${syncState.lastOffset}`);
      
      // Get existing events from cache or empty array
      let allEvents: ParsedEvent[] = [];
      if (!forceRefresh) {
        const cached = this.getCached<ParsedEvent[]>(cacheKey);
        if (cached !== null) {
          allEvents = [...cached];
        }
      }

      // Track API calls and new events found
      let apiCallsMade = 0;
      let newEventsFound = 0;
      let offset = forceRefresh ? 0 : syncState.lastOffset;
      let isFullySynced = false;

      // Incremental pagination to fetch all events
      while (true) {
        console.log(`📄 Fetching page at offset ${offset}`);
        const rawEvents = await this.fetchRawEvents(50, offset);
        apiCallsMade++;

        if (rawEvents.length === 0) {
          console.log('✅ No more events found - sync complete');
          isFullySynced = true;
          break;
        }

        // Parse new events
        const newParsedEvents: ParsedEvent[] = [];
        for (const rawEvent of rawEvents) {
          const parsed = this.parseEvent(rawEvent);
          if (parsed) {
            // Check if we already have this event (avoid duplicates)
            const isDuplicate = allEvents.some(existing => 
              existing.txId === parsed.txId && 
              ('block' in existing && 'block' in parsed && existing.block === parsed.block)
            );
            
            if (!isDuplicate) {
              newParsedEvents.push(parsed);
              newEventsFound++;
            }
          }
        }

        // Add new events to our collection
        allEvents.push(...newParsedEvents);

        console.log(`📊 Page ${Math.floor(offset/50) + 1}: ${rawEvents.length} raw events, ${newParsedEvents.length} new parsed events`);

        // Move to next page
        offset += 50;

        // Stop if we got fewer events than requested (reached the end)
        if (rawEvents.length < 50) {
          console.log('✅ Reached end of events - sync complete');
          isFullySynced = true;
          break;
        }

        // Safety check: don't make too many API calls in one sync
        if (apiCallsMade >= 20) {
          console.log('⚠️  Reached API call limit (20) - will continue next sync');
          break;
        }
      }

      // Sort all events by block number (newest first)
      allEvents.sort((a, b) => {
        const blockA = 'block' in a ? a.block : 0;
        const blockB = 'block' in b ? b.block : 0;
        return blockB - blockA;
      });

      // Update sync state
      this.updateSyncState(allEvents, apiCallsMade, offset, isFullySynced);

      // Cache the complete result
      this.setCached(cacheKey, allEvents, this.CACHE_TTL.EVENTS);

      console.log(`✅ Sync complete: ${allEvents.length} total events, ${newEventsFound} new events, ${apiCallsMade} API calls`);

      return allEvents;
    } catch (error) {
      console.error('Failed to sync events:', error);
      // Return cached events if available, empty array otherwise
      const cached = this.getCached<ParsedEvent[]>(cacheKey);
      return cached || [];
    }
  }

  /**
   * Check if we should continue syncing based on sync state
   */
  private shouldContinueSync(syncState: EventSyncState): boolean {
    // Continue if we haven't synced recently (older than cache TTL)
    const timeSinceLastSync = Date.now() - syncState.lastSyncTimestamp.getTime();
    const shouldResync = timeSinceLastSync > this.CACHE_TTL.EVENTS;

    // Continue if we know we're not fully synced
    const needsMoreEvents = !syncState.isFullySynced;

    return shouldResync || needsMoreEvents;
  }

  // ANALYTICS CALCULATIONS

  /**
   * Calculate daily distribution rate based on historical claim events
   */
  private calculateDailyRate(claims: ClaimEvent[]): {
    dailyRate: number;
    method: 'recent_7day' | 'recent_30day' | 'historical' | 'fallback';
    confidence: 'high' | 'medium' | 'low';
    periodDays: number;
  } {
    if (claims.length === 0) {
      return {
        dailyRate: 750_000_000, // Fallback constant
        method: 'fallback',
        confidence: 'low',
        periodDays: 0
      };
    }

    // Sort claims by block (oldest first)
    const sortedClaims = [...claims].sort((a, b) => a.block - b.block);
    const currentBlock = Math.max(...claims.map(c => c.block));

    // Calculate time periods in blocks
    const oneDayBlocks = this.STREAK_REQUIREMENTS.BLOCKS_PER_DAY;
    const sevenDayBlocks = oneDayBlocks * 7;
    const thirtyDayBlocks = oneDayBlocks * 30;

    // Recent 7-day calculation (highest confidence if sufficient data)
    const recent7DayClaims = claims.filter(c => c.block >= currentBlock - sevenDayBlocks);
    if (recent7DayClaims.length >= 2) { // Need at least 2 claims for reasonable sample
      const recent7DayAmount = recent7DayClaims.reduce((sum, c) => sum + c.amount, 0);
      return {
        dailyRate: recent7DayAmount / 7,
        method: 'recent_7day',
        confidence: recent7DayClaims.length >= 7 ? 'high' : 'medium',
        periodDays: 7
      };
    }

    // Recent 30-day calculation (medium confidence)
    const recent30DayClaims = claims.filter(c => c.block >= currentBlock - thirtyDayBlocks);
    if (recent30DayClaims.length >= 3) { // Need at least 3 claims for reasonable sample
      const recent30DayAmount = recent30DayClaims.reduce((sum, c) => sum + c.amount, 0);
      return {
        dailyRate: recent30DayAmount / 30,
        method: 'recent_30day',
        confidence: recent30DayClaims.length >= 15 ? 'medium' : 'low',
        periodDays: 30
      };
    }

    // Historical all-time calculation (low confidence for recent trends)
    if (sortedClaims.length >= 1) {
      const totalAmount = claims.reduce((sum, c) => sum + c.amount, 0);
      
      if (sortedClaims.length === 1) {
        // For single claim, estimate daily rate as the claim amount
        return {
          dailyRate: totalAmount,
          method: 'historical',
          confidence: 'low',
          periodDays: 1
        };
      } else {
        // Multiple claims - calculate based on time span
        const oldestBlock = sortedClaims[0].block;
        const newestBlock = sortedClaims[sortedClaims.length - 1].block;
        const blockSpan = newestBlock - oldestBlock;
        const daySpan = Math.max(1, blockSpan / oneDayBlocks);

        return {
          dailyRate: totalAmount / daySpan,
          method: 'historical',
          confidence: daySpan >= 7 ? 'medium' : 'low',
          periodDays: Math.round(daySpan)
        };
      }
    }

    // Fallback to constant
    return {
      dailyRate: 750_000_000,
      method: 'fallback',
      confidence: 'low',
      periodDays: 0
    };
  }

  /**
   * Calculate analytics for a specific user
   */
  async getUserAnalytics(userAddress: string): Promise<UserAnalytics | null> {
    const cacheKey = `user_analytics:${userAddress}`;
    
    // Check cache first
    const cached = this.getCached<UserAnalytics>(cacheKey);
    if (cached !== null) {
      // Ensure Date fields are properly converted from cached JSON strings
      return {
        ...cached,
        lastClaimTimestamp: cached.lastClaimTimestamp ? new Date(cached.lastClaimTimestamp) : undefined,
        nextClaimTime: cached.nextClaimTime ? new Date(cached.nextClaimTime) : undefined
      };
    }

    try {
      // Force refetch if no cached events found (could be an empty cache from failed fetch)
      const cachedEvents = this.getCached<ParsedEvent[]>('parsed_events');
      const shouldForceRefresh = cachedEvents === null || cachedEvents.length === 0;
      
      const events = await this.syncEvents(shouldForceRefresh);
      
      // Filter events for this user
      const userClaims = events.filter(e => e.type === 'claim' && e.user === userAddress) as ClaimEvent[];
      const userMilestones = events.filter(e => e.type === 'streak_milestone' && e.user === userAddress) as StreakMilestoneEvent[];

      if (userClaims.length === 0) {
        return null; // User has no claim history
      }

      // Sort claims by block (oldest first for streak calculation)
      userClaims.sort((a, b) => a.block - b.block);

      // Calculate basic stats
      const totalClaims = userClaims.length;
      const totalClaimed = userClaims.reduce((sum, claim) => sum + claim.amount, 0);
      const lastClaim = userClaims[userClaims.length - 1];
      const lastClaimBlock = lastClaim.block;

      // Calculate current and max streak
      const { currentStreak, maxStreak } = this.calculateStreaks(userClaims);

      // Calculate if user can claim now (cooldown check)
      const canClaimNow = await this.canUserClaimNow(lastClaimBlock);
      const nextClaimTime = await this.calculateNextClaimTime(lastClaimBlock);

      const userAnalytics: UserAnalytics = {
        address: userAddress,
        totalClaims,
        totalClaimed,
        currentStreak,
        maxStreak,
        lastClaimBlock,
        lastClaimTimestamp: lastClaim.timestamp,
        canClaimNow,
        nextClaimTime,
        streakMilestones: userMilestones,
        claimHistory: userClaims
      };

      // Cache the result
      this.setCached(cacheKey, userAnalytics, this.CACHE_TTL.USER_ANALYTICS);

      return userAnalytics;
    } catch (error) {
      console.error('Failed to calculate user analytics:', error);
      return null;
    }
  }

  /**
   * Calculate global analytics across all users
   */
  async getGlobalAnalytics(): Promise<GlobalAnalytics> {
    const cacheKey = 'global_analytics';
    
    // Check cache first
    const cached = this.getCached<GlobalAnalytics>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const events = await this.syncEvents();
      
      const claims = events.filter(e => e.type === 'claim') as ClaimEvent[];
      const deposits = events.filter(e => e.type === 'deposit') as DepositEvent[];

      // Calculate basic totals
      const totalClaims = claims.length;
      const totalClaimed = claims.reduce((sum, claim) => sum + claim.amount, 0);
      const totalDeposited = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
      
      // Calculate unique users
      const uniqueUsers = new Set([
        ...claims.map(c => c.user),
        ...deposits.map(d => d.depositor)
      ]).size;

      // Calculate streak statistics
      const streaks = claims.map(c => c.streak);
      const averageStreak = streaks.length > 0 ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;
      const longestStreak = Math.max(...streaks, 0);

      // Calculate recent activity (last 24 hours and 7 days in blocks)
      const currentBlock = Math.max(...claims.map(c => c.block), 0);
      const oneDayAgo = currentBlock - this.STREAK_REQUIREMENTS.BLOCKS_PER_DAY;
      const oneWeekAgo = currentBlock - (this.STREAK_REQUIREMENTS.BLOCKS_PER_DAY * 7);

      const dailyClaimCount = claims.filter(c => c.block >= oneDayAgo).length;
      const weeklyClaimCount = claims.filter(c => c.block >= oneWeekAgo).length;

      // Calculate daily distribution rate based on historical data
      const dailyRateCalculation = this.calculateDailyRate(claims);

      const globalAnalytics: GlobalAnalytics = {
        totalUsers: uniqueUsers,
        totalClaims,
        totalClaimed,
        totalDeposited,
        averageStreak,
        longestStreak,
        dailyClaimCount,
        weeklyClaimCount,
        calculatedDailyRate: dailyRateCalculation.dailyRate,
        dailyRateMethod: dailyRateCalculation.method,
        dataConfidence: dailyRateCalculation.confidence,
        ratePeriodDays: dailyRateCalculation.periodDays,
        lastUpdated: new Date()
      };

      // Cache the result
      this.setCached(cacheKey, globalAnalytics, this.CACHE_TTL.GLOBAL_ANALYTICS);

      return globalAnalytics;
    } catch (error) {
      console.error('Failed to calculate global analytics:', error);
      
      // Return empty analytics on error
      return {
        totalUsers: 0,
        totalClaims: 0,
        totalClaimed: 0,
        totalDeposited: 0,
        averageStreak: 0,
        longestStreak: 0,
        dailyClaimCount: 0,
        weeklyClaimCount: 0,
        calculatedDailyRate: 750_000_000, // Fallback constant
        dailyRateMethod: 'fallback',
        dataConfidence: 'low',
        ratePeriodDays: 0,
        lastUpdated: new Date()
      };
    }
  }

  // STREAK CALCULATION LOGIC

  /**
   * Calculate current and maximum streak for a user's claim history
   */
  private calculateStreaks(claims: ClaimEvent[]): { currentStreak: number; maxStreak: number } {
    if (claims.length === 0) {
      return { currentStreak: 0, maxStreak: 0 };
    }

    // Sort claims by block (oldest first)
    const sortedClaims = [...claims].sort((a, b) => a.block - b.block);
    
    let currentStreak = 1; // Start with 1 for the most recent claim
    let maxStreak = 1;
    let tempStreak = 1;

    // Walk through claims to find streaks
    for (let i = 1; i < sortedClaims.length; i++) {
      const prevClaim = sortedClaims[i - 1];
      const currentClaim = sortedClaims[i];
      const blockGap = currentClaim.block - prevClaim.block;

      // Check if claims are within streak range (allowing some flexibility)
      if (blockGap <= this.STREAK_REQUIREMENTS.MAX_STREAK_GAP) {
        tempStreak++;
      } else {
        // Streak broken, reset temporary counter
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }

    // Update max streak with the final temp streak
    maxStreak = Math.max(maxStreak, tempStreak);

    // Calculate current streak (working backwards from most recent claim)
    currentStreak = 1;
    for (let i = sortedClaims.length - 2; i >= 0; i--) {
      const laterClaim = sortedClaims[i + 1];
      const earlierClaim = sortedClaims[i];
      const blockGap = laterClaim.block - earlierClaim.block;

      if (blockGap <= this.STREAK_REQUIREMENTS.MAX_STREAK_GAP) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }

    return { currentStreak, maxStreak };
  }

  /**
   * Check if user can claim now based on cooldown period
   */
  private async canUserClaimNow(lastClaimBlock: number): Promise<boolean> {
    try {
      const currentBlock = await this.getCurrentBlockHeight();
      const blocksSinceLastClaim = currentBlock - lastClaimBlock;
      
      return blocksSinceLastClaim >= this.STREAK_REQUIREMENTS.COOLDOWN_BLOCKS;
    } catch (error) {
      console.error('Failed to get current block height for claim check:', error);
      // Fallback to conservative estimate
      const estimatedCurrentBlock = lastClaimBlock + 100;
      const blocksSinceLastClaim = estimatedCurrentBlock - lastClaimBlock;
      return blocksSinceLastClaim >= this.STREAK_REQUIREMENTS.COOLDOWN_BLOCKS;
    }
  }

  /**
   * Calculate when user can next claim
   */
  private async calculateNextClaimTime(lastClaimBlock: number): Promise<Date | undefined> {
    if (await this.canUserClaimNow(lastClaimBlock)) {
      return undefined; // Can claim now
    }

    try {
      const currentBlock = await this.getCurrentBlockHeight();
      const blocksUntilNextClaim = this.STREAK_REQUIREMENTS.COOLDOWN_BLOCKS - (currentBlock - lastClaimBlock);
      
      // If blocks until next claim is negative or zero, user can claim now
      if (blocksUntilNextClaim <= 0) {
        return undefined;
      }
      
      // Calculate time until next claim (5 seconds per block)
      const secondsUntilNextClaim = blocksUntilNextClaim * 5;
      
      return new Date(Date.now() + (secondsUntilNextClaim * 1000));
    } catch (error) {
      console.error('Failed to get current block height for next claim time:', error);
      // Fallback to conservative estimate
      const estimatedCurrentBlock = lastClaimBlock + 100;
      const blocksUntilNextClaim = this.STREAK_REQUIREMENTS.COOLDOWN_BLOCKS - (estimatedCurrentBlock - lastClaimBlock);
      const secondsUntilNextClaim = Math.max(0, blocksUntilNextClaim * 5);
      
      return new Date(Date.now() + (secondsUntilNextClaim * 1000));
    }
  }

  // PUBLIC UTILITY METHODS

  /**
   * Invalidate analytics caches (call after new claims/deposits)
   */
  public invalidateAnalytics(): void {
    // Clear analytics caches but keep raw events cache
    removeCacheEntriesByPrefix(this.cachePrefix + 'user_analytics:');
    removeCacheEntriesByPrefix(this.cachePrefix + 'global_analytics');
    
    // Also clear the events cache to force refetch
    localStorage.removeItem(this.cachePrefix + 'parsed_events');
  }

  /**
   * Get cache statistics for debugging
   */
  public getCacheStats(): { totalEntries: number; cacheKeys: string[] } {
    const keys: string[] = [];
    
    // Handle Node.js environment where localStorage is not available
    if (typeof localStorage === 'undefined') {
      return {
        totalEntries: 0,
        cacheKeys: ['localStorage not available in Node.js environment']
      };
    }
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.cachePrefix)) {
        keys.push(key.replace(this.cachePrefix, ''));
      }
    }
    return {
      totalEntries: keys.length,
      cacheKeys: keys
    };
  }

  /**
   * Get contract ID being monitored
   */
  public getContractId(): string {
    return this.contractId;
  }

  /**
   * Get network being used
   */
  public getNetwork(): NetworkType {
    return this.network;
  }
}

// Export singleton instances for both networks
export const eventsService = new ContractEventsService('mainnet');
export const eventsServiceTestnet = new ContractEventsService('testnet');

// Export the class for custom instances
export default ContractEventsService;