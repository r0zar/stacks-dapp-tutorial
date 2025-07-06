import { isValidStacksAddress } from './validators';
import { getCacheEntry, setCacheEntry, removeCacheEntriesByPrefix } from './serializers';

// Type definitions for faucet functionality
export interface FaucetClaimInfo {
    lastClaimBlock: number;
    streakCount: number;
    totalClaims: number;
    totalClaimed: number;
    canClaimNow: boolean;
    nextClaimBlock: number;
    timeUntilNextClaim: number; // seconds
}

export interface FaucetGlobalStats {
    totalSupply: number;
    distributed: number;
    remaining: number;
    dailyTarget: number;
    estimatedDaysRemaining: number;
    percentageRemaining: number;
}

export interface RewardTier {
    days: string;
    amount: number;
    color: string;
}

export interface ClaimResult {
    txId: string;
    success: boolean;
    error?: string;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}


type NetworkType = 'mainnet' | 'testnet';

// Mock user data storage (in real implementation, this would come from contract)
const MOCK_USER_DATA: Record<string, FaucetClaimInfo> = {};

/**
 * TBB Faucet Contract Wrapper
 * Provides faucet functionality with proper read-only vs public function distinction
 */
export class TBBFaucetContract {
    private readonly network: NetworkType;
    private readonly cachePrefix: string;

    // Cache TTL constants (in milliseconds)
    private readonly CACHE_TTL = {
        GLOBAL_STATS: 30 * 1000,      // 30 seconds - frequently changing data
        USER_CLAIM_INFO: 60 * 1000,   // 1 minute - user-specific data
        REWARD_TIERS: 300 * 1000,     // 5 minutes - rarely changing data
        CONTRACT_INFO: 600 * 1000     // 10 minutes - static data
    };

    // Constants matching UI implementation
    private readonly BLOCKS_PER_DAY = 17280; // 24 hours at 5 seconds per block
    private readonly MOCK_GLOBAL_STATS: FaucetGlobalStats = {
        totalSupply: 9_000_000_000,
        distributed: 450_000_000,
        remaining: 8_550_000_000,
        dailyTarget: 750_000_000,
        estimatedDaysRemaining: 12.3,
        percentageRemaining: 95.0
    };

    private readonly REWARD_TIERS: RewardTier[] = [
        { days: '1-3', amount: 50_000_000, color: 'from-blue-500 to-blue-600' },
        { days: '4-7', amount: 75_000_000, color: 'from-purple-500 to-purple-600' },
        { days: '8-14', amount: 100_000_000, color: 'from-orange-500 to-orange-600' },
        { days: '15+', amount: 125_000_000, color: 'from-red-500 to-red-600' }
    ];

    constructor(network: NetworkType = 'testnet') {
        this.network = network;
        this.cachePrefix = `tbb-faucet-cache:${this.network}:`;
    }

    // CACHE MANAGEMENT

    /**
     * Get cached value or null if expired/missing
     */
    private getCached<T>(key: string): T | null {
        const cacheKey = this.cachePrefix + key;
        return getCacheEntry<T>(cacheKey);
    }

    /**
     * Set cached value with TTL
     */
    private setCached<T>(key: string, data: T, ttl: number): void {
        const cacheKey = this.cachePrefix + key;
        setCacheEntry(cacheKey, data, ttl);
    }

    /**
     * Clear all cached data
     */
    public clearCache(): void {
        removeCacheEntriesByPrefix(this.cachePrefix);
    }

    /**
     * Clear specific cache entries by pattern
     */
    public clearCacheByPattern(pattern: string): void {
        removeCacheEntriesByPrefix(this.cachePrefix + pattern);
    }

    /**
     * Get cache statistics for debugging
     */
    public getCacheStats(): { totalEntries: number; cacheKeys: string[] } {
        const keys: string[] = [];
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

    // READ-ONLY FUNCTIONS (return actual data)

    /**
     * Get claim information for a specific user
     */
    async getClaimInfo(userAddress: string): Promise<FaucetClaimInfo> {
        // Validate address
        if (!isValidStacksAddress(userAddress)) {
            throw new Error('Invalid Stacks address');
        }

        // Check cache first
        const cacheKey = `claim_info:${userAddress}`;
        const cached = this.getCached<FaucetClaimInfo>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // Return mock data or create default for new user
        if (!MOCK_USER_DATA[userAddress]) {
            MOCK_USER_DATA[userAddress] = {
                lastClaimBlock: 0,
                streakCount: 7, // Mock 7-day streak
                totalClaims: 15,
                totalClaimed: 525_000_000,
                canClaimNow: true,
                nextClaimBlock: 0,
                timeUntilNextClaim: 0
            };
        }

        const claimInfo = { ...MOCK_USER_DATA[userAddress] };
        
        // Cache the result
        this.setCached(cacheKey, claimInfo, this.CACHE_TTL.USER_CLAIM_INFO);
        
        return claimInfo;
    }

    /**
     * Get global faucet statistics
     */
    async getGlobalStats(): Promise<FaucetGlobalStats> {
        // Check cache first
        const cacheKey = 'global_stats';
        const cached = this.getCached<FaucetGlobalStats>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // Simulate slight variations in distributed amount over time
        const variance = Math.floor(Math.random() * 10_000_000); // Up to 10M variance
        const globalStats = {
            ...this.MOCK_GLOBAL_STATS,
            distributed: this.MOCK_GLOBAL_STATS.distributed + variance,
            remaining: this.MOCK_GLOBAL_STATS.remaining - variance,
            percentageRemaining: ((this.MOCK_GLOBAL_STATS.remaining - variance) / this.MOCK_GLOBAL_STATS.totalSupply) * 100
        };

        // Cache the result
        this.setCached(cacheKey, globalStats, this.CACHE_TTL.GLOBAL_STATS);
        
        return globalStats;
    }

    /**
     * Get reward tier definitions
     */
    getRewardTiers(): RewardTier[] {
        // Check cache first
        const cacheKey = 'reward_tiers';
        const cached = this.getCached<RewardTier[]>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const rewardTiers = [...this.REWARD_TIERS];
        
        // Cache the result (reward tiers rarely change)
        this.setCached(cacheKey, rewardTiers, this.CACHE_TTL.REWARD_TIERS);
        
        return rewardTiers;
    }

    /**
     * Calculate current reward amount based on streak
     */
    getCurrentReward(streakCount: number): number {
        if (streakCount >= 15) return 125_000_000;
        if (streakCount >= 8) return 100_000_000;
        if (streakCount >= 4) return 75_000_000;
        return 50_000_000;
    }

    /**
     * Get next reward amount (after current claim)
     */
    getNextRewardAmount(streakCount: number): number {
        return this.getCurrentReward(streakCount + 1);
    }

    /**
     * Get current reward tier index
     */
    getTierIndex(streakCount: number): number {
        if (streakCount >= 15) return 3;
        if (streakCount >= 8) return 2;
        if (streakCount >= 4) return 1;
        return 0;
    }

    /**
     * Check if user can claim right now
     */
    async canClaim(userAddress: string): Promise<boolean> {
        const claimInfo = await this.getClaimInfo(userAddress);
        return claimInfo.canClaimNow;
    }

    /**
     * Get time until next claim in seconds
     */
    async getTimeUntilNextClaim(userAddress: string): Promise<number> {
        const claimInfo = await this.getClaimInfo(userAddress);
        return Math.max(0, claimInfo.timeUntilNextClaim);
    }

    /**
     * Validate if an address can participate in faucet
     */
    validateAddress(address: string): ValidationResult {
        if (!address) {
            return { isValid: false, error: 'Address is required' };
        }

        if (!isValidStacksAddress(address)) {
            return { isValid: false, error: 'Invalid Stacks address format' };
        }

        return { isValid: true };
    }

    /**
     * Get network-specific contract information
     */
    getContractInfo() {
        // Check cache first
        const cacheKey = `contract_info:${this.network}`;
        const cached = this.getCached<any>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const contractInfo = {
            network: this.network,
            contractName: 'tbb-faucet',
            blocksPerDay: this.BLOCKS_PER_DAY
        };

        // Cache the result (contract info is static)
        this.setCached(cacheKey, contractInfo, this.CACHE_TTL.CONTRACT_INFO);
        
        return contractInfo;
    }

    // PUBLIC FUNCTIONS (return txId only)

    /**
     * Claim tokens from faucet
     * Returns transaction ID only - success/failure determined later
     */
    async claimTokens(userAddress: string): Promise<ClaimResult> {
        try {
            // Validate address
            const validation = this.validateAddress(userAddress);
            if (!validation.isValid) {
                return {
                    txId: '',
                    success: false,
                    error: validation.error
                };
            }

            // Check if user can claim
            const canClaim = await this.canClaim(userAddress);
            if (!canClaim) {
                return {
                    txId: '',
                    success: false,
                    error: 'Cannot claim yet - still on cooldown'
                };
            }

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Generate mock transaction ID
            const txId = '0x' + Math.random().toString(16).substr(2, 40) + Math.random().toString(16).substr(2, 24);

            // Update local mock data optimistically
            // (In real implementation, this would happen on-chain)
            const claimInfo = await this.getClaimInfo(userAddress);
            const currentReward = this.getCurrentReward(claimInfo.streakCount);

            MOCK_USER_DATA[userAddress] = {
                ...claimInfo,
                lastClaimBlock: claimInfo.lastClaimBlock + this.BLOCKS_PER_DAY,
                streakCount: claimInfo.streakCount + 1,
                totalClaims: claimInfo.totalClaims + 1,
                totalClaimed: claimInfo.totalClaimed + currentReward,
                canClaimNow: false,
                nextClaimBlock: claimInfo.lastClaimBlock + this.BLOCKS_PER_DAY * 2,
                timeUntilNextClaim: 86400 // 24 hours in seconds
            };

            // Invalidate relevant cache entries after successful claim
            localStorage.removeItem(this.cachePrefix + `claim_info:${userAddress}`);
            localStorage.removeItem(this.cachePrefix + 'global_stats'); // Global stats change when someone claims

            return {
                txId,
                success: true
            };

        } catch (error) {
            return {
                txId: '',
                success: false,
                error: `Claim failed: ${error}`
            };
        }
    }

    /**
     * Simulate refreshing user data (would happen after transaction confirms)
     */
    async refreshUserData(userAddress: string): Promise<void> {
        // Invalidate cached user data to force fresh fetch
        localStorage.removeItem(this.cachePrefix + `claim_info:${userAddress}`);
        
        // In real implementation, this would re-fetch from contract
        // For now, we just ensure the user exists in our mock data and cache it fresh
        await this.getClaimInfo(userAddress);
    }

    /**
     * Clear cache/reset user data (for testing purposes)
     */
    clearUserData(userAddress: string): void {
        // Clear from both mock storage and cache
        delete MOCK_USER_DATA[userAddress];
        localStorage.removeItem(this.cachePrefix + `claim_info:${userAddress}`);
    }

    /**
     * Force refresh all analytics data (clears relevant caches)
     */
    public refreshAnalytics(): void {
        // Clear analytics-related cache entries
        localStorage.removeItem(this.cachePrefix + 'global_stats');
        this.clearCacheByPattern('claim_info:');
    }

    /**
     * Get cache hit/miss statistics for performance monitoring
     */
    public getCacheHitRate(): { hits: number; misses: number; hitRate: number } {
        // This is a simplified implementation - in production you'd track actual hits/misses
        const stats = this.getCacheStats();
        const totalEntries = stats.totalEntries;
        const estimatedHits = Math.floor(totalEntries * 0.7); // Assume 70% hit rate
        const estimatedMisses = Math.floor(totalEntries * 0.3);
        
        return {
            hits: estimatedHits,
            misses: estimatedMisses,
            hitRate: totalEntries > 0 ? estimatedHits / (estimatedHits + estimatedMisses) : 0
        };
    }
}

// Export singleton instances for both networks
export const tbbFaucetContract = new TBBFaucetContract('mainnet');
export const tbbFaucetContractTestnet = new TBBFaucetContract('testnet');

// Export the class for custom instances
export default TBBFaucetContract;