import { fetchCallReadOnlyFunction, cvToJSON, cvToValue, NoneCV, noneCV, Pc, principalCV, uintCV } from '@stacks/transactions';
import { request } from '@stacks/connect';
import { Cl } from '@stacks/transactions';
import { CallContractParams } from '@stacks/connect/dist/types/methods';
import { getCacheEntry, setCacheEntry, removeCacheEntriesByPrefix } from './serializers';

// Contract details by network
const CONTRACT_ADDRESSES = {
  mainnet: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS',
  testnet: 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR',
} as const;

const CONTRACT_NAME = 'tropical-blue-bonobo';
const DEFAULT_NETWORK = 'mainnet';

const NAME = 'Token';
const SYMBOL = 'TKN';
const DECIMALS = 0;

// TypeScript interfaces
export interface TokenMetadata {
  sip: number;
  name: string;
  image?: string;
  description?: string;
  [key: string]: any;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  tokenUri: TokenMetadata;
}

export interface TransferOptions {
  amount: number;
  sender: string;
  recipient: string;
  memo?: string;
}

export interface ContractCallResult {
  txId: string;
  success: boolean;
  error?: string;
}

type NetworkType = 'mainnet' | 'testnet';

interface SerializableCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Tropical Blue Bonobo Token Contract Wrapper
 * Provides access to SIP-10 token functionality on Stacks blockchain
 */
export class TropicalBlueBonoboToken {
  private readonly contractName: string;
  private readonly network: NetworkType;
  private readonly cachePrefix: string;

  // Cache TTL in milliseconds
  private readonly STATIC_DATA_TTL = 60 * 60 * 1000; // 1 hour for static data (name, symbol, decimals)
  private readonly DYNAMIC_DATA_TTL = 30 * 1000; // 30 seconds for dynamic data (balances, total supply)

  constructor(network: NetworkType = DEFAULT_NETWORK as NetworkType) {
    this.contractName = CONTRACT_NAME;
    this.network = network;
    this.cachePrefix = `tbb-token-cache:${this.network}:`;
  }

  /**
   * Serialize data for localStorage (handles BigInt)
   */
  private serializeCacheData(data: any): any {
    if (typeof data === 'bigint') {
      return { __type: 'bigint', value: data.toString() };
    }
    if (Array.isArray(data)) {
      return data.map(item => this.serializeCacheData(item));
    }
    if (data && typeof data === 'object') {
      const serialized: any = {};
      for (const [key, value] of Object.entries(data)) {
        serialized[key] = this.serializeCacheData(value);
      }
      return serialized;
    }
    return data;
  }

  /**
   * Deserialize data from localStorage (handles BigInt)
   */
  private deserializeCacheData(data: any): any {
    if (data && typeof data === 'object' && data.__type === 'bigint') {
      return BigInt(data.value);
    }
    if (Array.isArray(data)) {
      return data.map(item => this.deserializeCacheData(item));
    }
    if (data && typeof data === 'object') {
      const deserialized: any = {};
      for (const [key, value] of Object.entries(data)) {
        deserialized[key] = this.deserializeCacheData(value);
      }
      return deserialized;
    }
    return data;
  }

  private get contractAddress(): string {
    return CONTRACT_ADDRESSES[this.network];
  }

  private get fullContractId(): `${string}.${string}` {
    return `${this.contractAddress}.${this.contractName}`;
  }

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
    try {
      const cacheKey = this.cachePrefix + key;
      const entry: SerializableCacheEntry = {
        data: this.serializeCacheData(data),
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      // If localStorage is not available or quota exceeded, silently fail
      console.warn('Failed to set cache:', error);
    }
  }

  /**
   * Clear cache (useful for clearing balance cache after transfers)
   */
  public clearCache(): void {
    try {
      // Clear all localStorage keys with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cachePrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Clear balance cache for a specific address
   */
  public clearBalanceCache(address?: string): void {
    try {
      if (address) {
        const cacheKey = this.cachePrefix + `balance:${address}`;
        localStorage.removeItem(cacheKey);
      } else {
        // Clear all balance entries
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.cachePrefix + 'balance:')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Failed to clear balance cache:', error);
    }
  }

  // Read-only functions using callReadOnlyFunction

  /**
   * Get the token name
   */
  async getName(): Promise<string> {
    return NAME;
  }

  /**
   * Get the token symbol
   */
  async getSymbol(): Promise<string> {
    return SYMBOL;
  }

  /**
   * Get the token decimals
   */
  async getDecimals(): Promise<number> {
    return DECIMALS;
  }

  /**
   * Get balance for a specific address
   */
  async getBalance(address: string): Promise<bigint> {
    const cacheKey = `balance:${address}`;
    const cached = this.getCached<bigint>(cacheKey);
    if (cached !== null) return cached;

    try {
      const result = await fetchCallReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'get-balance',
        functionArgs: [Cl.principal(address)],
        network: this.network as any,
        senderAddress: this.contractAddress,
      });

      const jsonResult = cvToJSON(result);
      const balance = BigInt(jsonResult.value.value);
      this.setCached(cacheKey, balance, this.DYNAMIC_DATA_TTL);
      return balance;
    } catch (error) {
      throw new Error(`Failed to get balance for ${address}: ${error}`);
    }
  }

  /**
   * Get the total supply of tokens
   */
  async getTotalSupply(): Promise<bigint> {
    const cacheKey = 'totalSupply';
    const cached = this.getCached<bigint>(cacheKey);
    if (cached !== null) return cached;

    try {
      const result = await fetchCallReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'get-total-supply',
        functionArgs: [],
        network: this.network as any,
        senderAddress: this.contractAddress,
      });

      const jsonResult = cvToJSON(result);
      const totalSupply = BigInt(jsonResult.value.value);
      this.setCached(cacheKey, totalSupply, this.DYNAMIC_DATA_TTL);
      return totalSupply;
    } catch (error) {
      throw new Error(`Failed to get total supply: ${error}`);
    }
  }

  /**
   * Get the token URI and decode the base64 JSON metadata
   */
  async getTokenUri(): Promise<TokenMetadata> {
    const cacheKey = 'tokenUri';
    const cached = this.getCached<TokenMetadata>(cacheKey);
    if (cached !== null) return cached;

    try {
      const result = await fetchCallReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'get-token-uri',
        functionArgs: [],
        network: this.network as any,
        senderAddress: this.contractAddress,
      }) as any;

      const tokenUriString = result.value?.value || result.value?.data;

      if (!tokenUriString || typeof tokenUriString !== 'string') {
        throw new Error(`Invalid token URI response: ${JSON.stringify(result)}`);
      }

      // Decode base64 JSON
      let jsonString: string;

      // Check if it's a data URI
      if (tokenUriString.startsWith('data:application/json;base64,')) {
        const base64Data = tokenUriString.replace('data:application/json;base64,', '');
        jsonString = atob(base64Data);
      } else {
        // Try direct base64 decode
        jsonString = atob(tokenUriString);
      }

      const metadata: TokenMetadata = JSON.parse(jsonString);

      this.setCached(cacheKey, metadata, this.STATIC_DATA_TTL);
      return metadata;
    } catch (error) {
      throw new Error(`Failed to get token URI: ${error}`);
    }
  }

  /**
   * Get all token information at once
   */
  async getTokenInfo(): Promise<TokenInfo> {
    try {
      const [name, symbol, decimals, totalSupply, tokenUri] = await Promise.all([
        this.getName(),
        this.getSymbol(),
        this.getDecimals(),
        this.getTotalSupply(),
        this.getTokenUri(),
      ]);

      return {
        name,
        symbol,
        decimals,
        totalSupply,
        tokenUri,
      };
    } catch (error) {
      throw new Error(`Failed to get token info: ${error}`);
    }
  }

  /**
   * Get the full contract identifier
   */
  getContractId(): string {
    return this.fullContractId;
  }

  /**
   * Get the explorer URL for this contract
   */
  getExplorerUrl(): string {
    return `https://explorer.stacks.co/address/${this.fullContractId}?chain=${this.network}`;
  }

  // Public functions using request pattern

  /**
   * Transfer tokens to another address
   */
  async transfer(options: TransferOptions): Promise<ContractCallResult> {
    try {
      const { amount, sender, recipient, memo } = options;

      // Build function arguments
      const functionArgs = [
        Cl.uint(amount),
        Cl.principal(sender),
        Cl.principal(recipient),
        memo ? Cl.some(Cl.bufferFromHex(memo)) : Cl.none(),
      ];

      const params: CallContractParams = {
        contract: this.fullContractId,
        functionName: 'transfer',
        functionArgs,
        network: this.network,
        postConditionMode: 'deny',
        postConditions: [
          Pc.principal(sender).willSendEq(amount).ft(this.fullContractId, 'TKN')
        ],
      };

      const response = await request('stx_callContract', params);

      console.log('response', response);

      // Clear balance cache for sender and recipient after successful transfer
      this.clearBalanceCache(sender);
      this.clearBalanceCache(recipient);
      // Also clear total supply cache as it might have changed
      localStorage.removeItem(this.cachePrefix + 'totalSupply');

      return {
        txId: response.txid || '',
        success: true,
      };
    } catch (error) {
      console.log('error', error);
      return {
        txId: '',
        success: false,
        error: `Transfer failed: ${error}`,
      };
    }
  }
}

// Create and export singleton instances for both networks
export const tropicalBlueBonoboToken = new TropicalBlueBonoboToken('mainnet');
export const tropicalBlueBonoboTokenTestnet = new TropicalBlueBonoboToken('testnet');

// Export the class for custom instances
export default TropicalBlueBonoboToken;