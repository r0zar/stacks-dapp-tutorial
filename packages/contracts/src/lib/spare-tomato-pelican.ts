import { isValidStacksAddress } from './validators';
import { getCacheEntry, setCacheEntry, removeCacheEntriesByPrefix } from './serializers';
import { request } from '@stacks/connect';
import { Cl, Pc, fetchCallReadOnlyFunction, cvToJSON } from '@stacks/transactions';
import { CallContractParams } from '@stacks/connect/dist/types/methods';
import { ContractEventsService, eventsService, eventsServiceTestnet } from './events';

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
    dailyRate: number;
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

// Contract details by network
const CONTRACT_ADDRESSES = {
    mainnet: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS',
    testnet: 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR',
} as const;

const TOKEN_CONTRACT_NAME = 'tropical-blue-bonobo';
const FAUCET_CONTRACT_NAME = 'spare-tomato-pelican';

/**
 * TBB Faucet Contract Wrapper
 * Provides faucet functionality with proper read-only vs public function distinction
 */
export class TBBFaucetContract {
    private readonly network: NetworkType;
    private readonly cachePrefix: string;
    private readonly eventsService: ContractEventsService;

    // Cache TTL constants (in milliseconds)
    private readonly CACHE_TTL = {
        GLOBAL_STATS: 30 * 1000,      // 30 seconds - frequently changing data
        USER_CLAIM_INFO: 60 * 1000,   // 1 minute - user-specific data
        REWARD_TIERS: 300 * 1000,     // 5 minutes - rarely changing data
        CONTRACT_INFO: 600 * 1000     // 10 minutes - static data
    };

    // Constants matching UI implementation
    private readonly BLOCKS_PER_DAY = 17280; // 24 hours at 5 seconds per block

    private readonly REWARD_TIERS: RewardTier[] = [
        { days: '1-3', amount: 50_000_000, color: 'from-blue-500 to-blue-600' },
        { days: '4-7', amount: 75_000_000, color: 'from-purple-500 to-purple-600' },
        { days: '8-14', amount: 100_000_000, color: 'from-orange-500 to-orange-600' },
        { days: '15+', amount: 125_000_000, color: 'from-red-500 to-red-600' }
    ];

    constructor(network: NetworkType = 'testnet') {
        this.network = network;
        this.cachePrefix = `tbb-faucet-cache:${this.network}:`;
        // Initialize events service for this network
        this.eventsService = network === 'mainnet' ? eventsService : eventsServiceTestnet;
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
     * Get the faucet contract's token balance
     */
    async getFaucetBalance(): Promise<number> {
        // Check cache first
        const cacheKey = 'faucet_balance';
        const cached = this.getCached<number>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        try {
            const result = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESSES[this.network],
                contractName: TOKEN_CONTRACT_NAME,
                functionName: 'get-balance',
                functionArgs: [Cl.principal(this.getFaucetContractId())],
                network: this.network as any,
                senderAddress: CONTRACT_ADDRESSES[this.network],
            });

            const jsonResult = cvToJSON(result);
            const balance = Number(jsonResult.value.value);

            // Cache the result with shorter TTL since faucet balance changes frequently
            this.setCached(cacheKey, balance, this.CACHE_TTL.GLOBAL_STATS);

            return balance;
        } catch (error) {
            console.warn(`Failed to get faucet balance: ${error}`);
            // Return 0 on error rather than throwing
            return 0;
        }
    }

    /**
     * Get the total supply of tokens
     */
    async getTotalSupply(): Promise<number> {
        return 10_000_000_000;
    }

    /**
     * Get claim information for a specific user using real event data
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

        try {
            // Get real analytics from events service
            const userAnalytics = await this.eventsService.getUserAnalytics(userAddress);

            let claimInfo: FaucetClaimInfo;

            if (userAnalytics) {
                // User has claim history - use real data
                const timeUntilNextClaim = userAnalytics.nextClaimTime
                    ? Math.max(0, Math.floor((userAnalytics.nextClaimTime.getTime() - Date.now()) / 1000))
                    : 0;

                const nextClaimBlock = userAnalytics.canClaimNow
                    ? userAnalytics.lastClaimBlock
                    : userAnalytics.lastClaimBlock + this.BLOCKS_PER_DAY;

                claimInfo = {
                    lastClaimBlock: userAnalytics.lastClaimBlock,
                    streakCount: userAnalytics.currentStreak,
                    totalClaims: userAnalytics.totalClaims,
                    totalClaimed: userAnalytics.totalClaimed,
                    canClaimNow: userAnalytics.canClaimNow,
                    nextClaimBlock,
                    timeUntilNextClaim
                };
            } else {
                // New user with no claim history
                claimInfo = {
                    lastClaimBlock: 0,
                    streakCount: 0,
                    totalClaims: 0,
                    totalClaimed: 0,
                    canClaimNow: true,
                    nextClaimBlock: 0,
                    timeUntilNextClaim: 0
                };
            }

            // Cache the result
            this.setCached(cacheKey, claimInfo, this.CACHE_TTL.USER_CLAIM_INFO);

            return claimInfo;
        } catch (error) {
            console.warn(`Failed to get claim info for ${userAddress}:`, error);

            // Fallback to default values on error
            const claimInfo: FaucetClaimInfo = {
                lastClaimBlock: 0,
                streakCount: 0,
                totalClaims: 0,
                totalClaimed: 0,
                canClaimNow: true,
                nextClaimBlock: 0,
                timeUntilNextClaim: 0
            };

            return claimInfo;
        }
    }

    /**
     * Get global faucet statistics using real contract and event data
     */
    async getGlobalStats(): Promise<FaucetGlobalStats> {
        // Check cache first
        const cacheKey = 'global_stats';
        const cached = this.getCached<FaucetGlobalStats>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // Get real data from contracts and events
        const [faucetBalance, totalSupply, globalAnalytics] = await Promise.all([
            this.getFaucetBalance(),
            this.getTotalSupply(),
            this.eventsService.getGlobalAnalytics()
        ]);

        const distributed = totalSupply - faucetBalance;
        const percentageRemaining = totalSupply > 0 ? (faucetBalance / totalSupply) * 100 : 0;

        // Use calculated daily rate from events analytics
        const dailyRate = globalAnalytics.calculatedDailyRate;

        const estimatedDaysRemaining = dailyRate > 0 ? faucetBalance / dailyRate : 0;

        const globalStats: FaucetGlobalStats = {
            totalSupply,
            distributed,
            remaining: faucetBalance,
            dailyRate,
            estimatedDaysRemaining,
            percentageRemaining
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
            contractName: 'spare-tomato-pelican',
            blocksPerDay: this.BLOCKS_PER_DAY
        };

        // Cache the result (contract info is static)
        this.setCached(cacheKey, contractInfo, this.CACHE_TTL.CONTRACT_INFO);

        return contractInfo;
    }

    // PUBLIC FUNCTIONS (return txId only)

    /**
     * Claim tokens from faucet using real contract call
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

            // Get current reward amount for post-conditions
            const claimInfo = await this.getClaimInfo(userAddress);
            const currentReward = this.getCurrentReward(claimInfo.streakCount);

            // Build contract call parameters
            const params: CallContractParams = {
                contract: this.getFaucetContractId(),
                functionName: 'claim-tokens',
                functionArgs: [], // No arguments - contract uses tx-sender
                network: this.network,
                postConditionMode: 'deny',
                postConditions: [
                    // Faucet contract will send tokens to user
                    Pc.principal(this.getFaucetContractId())
                        .willSendEq(currentReward)
                        .ft(this.getTokenContractId(), 'TKN')
                ],
            };

            console.log('Faucet claim params:', params);

            // Execute real contract call
            const response = await request('stx_callContract', params);

            console.log('Faucet claim response:', response);

            // Invalidate relevant cache entries after successful claim
            localStorage.removeItem(this.cachePrefix + `claim_info:${userAddress}`);
            localStorage.removeItem(this.cachePrefix + 'global_stats'); // Global stats change when someone claims
            localStorage.removeItem(this.cachePrefix + 'faucet_balance'); // Faucet balance decreases when tokens are claimed

            // Invalidate events service analytics (will refetch new events with the claim)
            this.eventsService.invalidateAnalytics();

            return {
                txId: response.txid || '',
                success: true,
            };

        } catch (error) {
            console.error('Faucet claim error:', error);
            return {
                txId: '',
                success: false,
                error: `Claim failed: ${error}`,
            };
        }
    }

    /**
     * Deposit tokens to seed the faucet
     * Returns transaction ID only - success/failure determined later
     */
    async depositTokens(senderAddress: string, amount: number): Promise<ClaimResult> {
        try {
            // Validate address
            const validation = this.validateAddress(senderAddress);
            if (!validation.isValid) {
                return {
                    txId: '',
                    success: false,
                    error: validation.error
                };
            }

            // Validate amount
            if (!amount || amount <= 0) {
                return {
                    txId: '',
                    success: false,
                    error: 'Deposit amount must be greater than 0'
                };
            }

            // Build contract call parameters
            const params: CallContractParams = {
                contract: this.getFaucetContractId(),
                functionName: 'deposit-tokens',
                functionArgs: [Cl.uint(amount)], // Amount to deposit
                network: this.network,
                postConditionMode: 'deny',
                postConditions: [
                    // Sender will send tokens to faucet contract
                    Pc.principal(senderAddress)
                        .willSendEq(amount)
                        .ft(this.getTokenContractId(), 'TKN')
                ],
            };

            // Execute real contract call
            const response = await request('stx_callContract', params);

            console.log('Faucet deposit response:', response);

            // Invalidate global stats cache after successful deposit (faucet balance changes)
            localStorage.removeItem(this.cachePrefix + 'global_stats');
            localStorage.removeItem(this.cachePrefix + 'faucet_balance'); // Faucet balance increases when tokens are deposited

            // Invalidate events service analytics (will refetch new events with the deposit)
            this.eventsService.invalidateAnalytics();

            return {
                txId: response.txid || '',
                success: true,
            };

        } catch (error) {
            console.error('Faucet deposit error:', error);
            return {
                txId: '',
                success: false,
                error: `Deposit failed: ${error}`,
            };
        }
    }

    /**
     * Refresh user data after transaction confirms
     */
    async refreshUserData(userAddress: string): Promise<void> {
        // Invalidate cached user data to force fresh fetch
        localStorage.removeItem(this.cachePrefix + `claim_info:${userAddress}`);

        // Invalidate events service cache to get latest transaction data
        this.eventsService.invalidateAnalytics();

        // Re-fetch user claim info with fresh data
        await this.getClaimInfo(userAddress);
    }

    /**
     * Clear cache/reset user data (for testing purposes)
     */
    clearUserData(userAddress: string): void {
        // Clear user data from cache
        localStorage.removeItem(this.cachePrefix + `claim_info:${userAddress}`);

        // Clear events service cache for this user
        this.eventsService.invalidateAnalytics();
    }

    /**
     * Force refresh all analytics data (clears relevant caches)
     */
    public refreshAnalytics(): void {
        // Clear analytics-related cache entries
        localStorage.removeItem(this.cachePrefix + 'global_stats');
        this.clearCacheByPattern('claim_info:');

        // Clear events service analytics cache
        this.eventsService.invalidateAnalytics();
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

    // CONTRACT DEPLOYMENT CHECKING

    /**
     * Get the full contract ID for the faucet
     */
    getFaucetContractId(): `${string}.${string}` {
        return `${CONTRACT_ADDRESSES[this.network]}.${FAUCET_CONTRACT_NAME}`;
    }

    /**
     * Get the full contract ID for the token
     */
    getTokenContractId(): `${string}.${string}` {
        return `${CONTRACT_ADDRESSES[this.network]}.${TOKEN_CONTRACT_NAME}`;
    }

    /**
     * Get the explorer URL for the faucet contract
     */
    getFaucetContractUrl(): string {
        return `https://explorer.stacks.co/txid/${this.getFaucetContractId()}?chain=${this.network}`;
    }

    /**
     * Get the explorer URL for the token contract
     */
    getTokenContractUrl(): string {
        return `https://explorer.stacks.co/txid/${this.getTokenContractId()}?chain=${this.network}`;
    }

    /**
     * Check if a contract is deployed on the network
     */
    async checkContractDeployment(contractId: string): Promise<boolean> {
        try {
            const apiUrl = this.network === 'mainnet'
                ? 'https://api.mainnet.hiro.so'
                : 'https://api.testnet.hiro.so';

            const response = await fetch(`${apiUrl}/extended/v1/contract/${contractId}`);

            // Return true if contract is found (200), false if not found (404) or other errors
            return response.status === 200;
        } catch (error) {
            console.warn(`Error checking contract ${contractId}:`, error);
            return false;
        }
    }

    /**
     * Check if the token contract is deployed
     */
    async isTokenContractDeployed(): Promise<boolean> {
        return this.checkContractDeployment(this.getTokenContractId());
    }

    /**
     * Check if the faucet contract is deployed
     */
    async isFaucetContractDeployed(): Promise<boolean> {
        return this.checkContractDeployment(this.getFaucetContractId());
    }

    /**
     * Check if both contracts required for the faucet are deployed
     */
    async areContractsDeployed(): Promise<{
        tokenContract: boolean;
        faucetContract: boolean;
        allDeployed: boolean;
    }> {
        const [tokenContract, faucetContract] = await Promise.all([
            this.isTokenContractDeployed(),
            this.isFaucetContractDeployed()
        ]);

        return {
            tokenContract,
            faucetContract,
            allDeployed: tokenContract && faucetContract
        };
    }
}

// Export singleton instances for both networks
export const tbbFaucetContract = new TBBFaucetContract('mainnet');
export const tbbFaucetContractTestnet = new TBBFaucetContract('testnet');

// Export the class for custom instances
export default TBBFaucetContract;