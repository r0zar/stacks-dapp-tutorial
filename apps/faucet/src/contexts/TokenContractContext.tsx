import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { connect, disconnect, isConnected, getLocalStorage } from '@stacks/connect';
import {
  tropicalBlueBonoboToken,
  tropicalBlueBonoboTokenTestnet,
  TropicalBlueBonoboToken,
  tbbFaucetContract,
  tbbFaucetContractTestnet,
  TBBFaucetContract,
  type TokenInfo,
  type TransferOptions,
  type ContractCallResult,
  type FaucetClaimInfo,
  type FaucetGlobalStats,
  type RewardTier,
  type ClaimResult
} from 'contracts';

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: bigint;
  network: 'mainnet' | 'testnet';
  isLoading: boolean;
}

export interface FaucetState {
  claimInfo: FaucetClaimInfo | null;
  globalStats: FaucetGlobalStats | null;
  rewardTiers: RewardTier[];
  isLoading: boolean;
  lastClaimedAmount: number;
  lastTxId: string | undefined;
}

export interface TokenContractContextType {
  wallet: WalletState;
  tokenInfo: TokenInfo | null;
  faucet: FaucetState;
  isConnecting: boolean;
  connect: () => void;
  disconnect: () => void;
  getBalance: (address: string) => Promise<bigint>;
  transfer: (options: Omit<TransferOptions, 'sender'>) => Promise<ContractCallResult>;
  refreshBalance: () => Promise<void>;
  refreshTokenInfo: () => Promise<void>;
  refreshFaucetData: (forceRefresh?: boolean, explicitNetwork?: 'mainnet' | 'testnet') => Promise<void>;
  claimTokens: () => Promise<ClaimResult>;
  depositTokens: (amount: number) => Promise<ClaimResult>;
  getExplorerUrl: () => string;
  switchNetwork: (network: 'mainnet' | 'testnet') => void;
  getFaucetContract: () => TBBFaucetContract;
}

const TokenContractContext = createContext<TokenContractContextType | undefined>(undefined);

export const useTokenContract = (): TokenContractContextType => {
  const context = useContext(TokenContractContext);
  if (context === undefined) {
    throw new Error('useTokenContract must be used within a TokenContractProvider');
  }
  return context;
};

interface TokenContractProviderProps {
  children: ReactNode;
}

const getStoredNetwork = (): 'mainnet' | 'testnet' => {
  try {
    const stored = localStorage.getItem('stacks-network-preference');
    return (stored === 'mainnet' || stored === 'testnet') ? stored : 'testnet';
  } catch (error) {
    console.warn('Failed to read network preference from localStorage:', error);
    return 'testnet';
  }
};

const setStoredNetwork = (network: 'mainnet' | 'testnet') => {
  try {
    localStorage.setItem('stacks-network-preference', network);
  } catch (error) {
    console.warn('Failed to save network preference to localStorage:', error);
  }
};

export const TokenContractProvider: React.FC<TokenContractProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    balance: 0n,
    network: getStoredNetwork(), // Load from localStorage or default to testnet
    isLoading: false,
  });

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [faucet, setFaucet] = useState<FaucetState>({
    claimInfo: null,
    globalStats: null,
    rewardTiers: [],
    isLoading: false,
    lastClaimedAmount: 0,
    lastTxId: undefined,
  });

  // Get the appropriate contract instances based on network
  const getContract = useCallback((): TropicalBlueBonoboToken => {
    return wallet.network === 'mainnet' ? tropicalBlueBonoboToken : tropicalBlueBonoboTokenTestnet;
  }, [wallet.network]);

  const getFaucetContract = useCallback((): TBBFaucetContract => {
    return wallet.network === 'mainnet' ? tbbFaucetContract : tbbFaucetContractTestnet;
  }, [wallet.network]);

  // Initialize wallet state from existing connection
  useEffect(() => {
    const checkConnection = () => {
      if (isConnected()) {
        const data = getLocalStorage();
        if (data?.addresses?.stx?.[0]?.address) {
          setWallet(prev => {
            // Only update if something actually changed
            if (prev.connected !== true || prev.address !== data.addresses.stx[0].address) {
              return {
                ...prev,
                connected: true,
                address: data.addresses.stx[0].address,
              };
            }
            return prev;
          });
        }
      } else {
        setWallet(prev => {
          // Only update if something actually changed
          if (prev.connected !== false) {
            return {
              ...prev,
              connected: false,
              address: null,
              balance: 0n,
            };
          }
          return prev;
        });
      }
    };

    checkConnection();

    // Listen for storage changes to detect wallet connection/disconnection
    const handleStorageChange = () => {
      checkConnection();
    };

    window.addEventListener('storage', handleStorageChange);

    // Also periodically check connection state (every 30 seconds)
    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Load token info only once on mount
  useEffect(() => {
    const loadTokenInfo = async () => {
      try {
        const contract = getContract();
        const info = await contract.getTokenInfo();
        setTokenInfo(info);
      } catch (error) {
        console.error('Failed to load token info:', error);
      }
    };

    loadTokenInfo();
  }, []); // Empty dependency array - only run once on mount

  // Load user balance when wallet connects or network changes
  useEffect(() => {
    if (wallet.connected && wallet.address) {
      const loadBalance = async () => {
        setWallet(prev => ({ ...prev, isLoading: true }));
        try {
          const contract = getContract();
          const balance = await contract.getBalance(wallet.address!);
          setWallet(prev => ({
            ...prev,
            balance,
            isLoading: false,
          }));
        } catch (error) {
          console.error('Failed to refresh balance:', error);
          setWallet(prev => ({ ...prev, isLoading: false }));
        }
      };
      loadBalance();
    }
  }, [wallet.connected, wallet.address, wallet.network]);

  // Load faucet data when wallet connects or network changes
  useEffect(() => {
    if (wallet.connected && wallet.address) {
      refreshFaucetData(false);
    } else {
      // Reset faucet data when wallet disconnects
      setFaucet({
        claimInfo: null,
        globalStats: null,
        rewardTiers: [],
        isLoading: false,
        lastClaimedAmount: 0,
        lastTxId: undefined,
      });
    }
  }, [wallet.connected, wallet.address, wallet.network, tokenInfo]);

  const connectWallet = async () => {
    setIsConnecting(true);

    try {
      const response = await connect();

      console.log('Connect response:', response);

      // Update state immediately if we get a response
      if (response?.addresses?.[2]?.address) {
        setWallet(prev => ({
          ...prev,
          connected: true,
          address: response.addresses[2].address,
        }));
      }

      // Also check localStorage after a short delay to ensure state is updated
      setTimeout(() => {
        if (isConnected()) {
          const data = getLocalStorage();
          console.log('LocalStorage data after connect:', data);
          if (data?.addresses?.stx?.[0]?.address) {
            setWallet(prev => ({
              ...prev,
              connected: true,
              address: data.addresses.stx[0].address,
            }));
          }
        }
      }, 100);

    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setWallet({
      connected: false,
      address: null,
      balance: 0n,
      network: 'testnet',
      isLoading: false,
    });
  };

  const getBalance = async (address: string): Promise<bigint> => {
    try {
      const contract = getContract();
      return await contract.getBalance(address);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0n;
    }
  };

  const refreshBalance = async (): Promise<void> => {
    if (!wallet.address) return;

    setWallet(prev => ({ ...prev, isLoading: true }));

    try {
      const balance = await getBalance(wallet.address);
      setWallet(prev => ({
        ...prev,
        balance,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      setWallet(prev => ({ ...prev, isLoading: false }));
    }
  };

  const refreshTokenInfo = async (): Promise<void> => {
    try {
      const contract = getContract();
      const info = await contract.getTokenInfo();
      setTokenInfo(info);
    } catch (error) {
      console.error('Failed to refresh token info:', error);
    }
  };

  const refreshFaucetData = async (forceRefresh: boolean = false, explicitNetwork?: 'mainnet' | 'testnet'): Promise<void> => {
    if (!wallet.address) return;

    // Use explicit network if provided, otherwise fall back to wallet state
    const targetNetwork = explicitNetwork || wallet.network;

    console.log('🔄 [TokenContractContext] refreshFaucetData called with wallet.address:', wallet.address);
    console.log('🔄 [TokenContractContext] Force refresh:', forceRefresh);
    console.log('🔄 [TokenContractContext] Target network:', targetNetwork);

    setFaucet(prev => ({ ...prev, isLoading: true }));

    try {
      // Get the correct contract for the target network (not dependent on wallet state)
      const faucetContract = targetNetwork === 'mainnet' ? tbbFaucetContract : tbbFaucetContractTestnet;
      console.log('🏭 [TokenContractContext] Using faucet contract for network:', targetNetwork);

      // Clear caches if force refresh is requested
      if (forceRefresh) {
        console.log('🗑️ [TokenContractContext] Clearing all caches...');
        faucetContract.clearCache();
        faucetContract.refreshAnalytics();
      }

      const [userClaimInfo, stats, tiers] = await Promise.all([
        faucetContract.getClaimInfo(wallet.address),
        faucetContract.getGlobalStats(),
        faucetContract.getRewardTiers()
      ]);

      console.log('🏭 [TokenContractContext] Stats:', stats);

      console.log('📊 [TokenContractContext] Received claim info:', userClaimInfo);

      setFaucet(prev => ({
        ...prev,
        claimInfo: userClaimInfo,
        globalStats: stats,
        rewardTiers: tiers,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load faucet data:', error);
      setFaucet(prev => ({ ...prev, isLoading: false }));
    }
  };

  const claimTokens = async (): Promise<ClaimResult> => {
    if (!wallet.address) {
      return {
        txId: '',
        success: false,
        error: 'Wallet not connected',
      };
    }

    try {
      const faucetContract = getFaucetContract();
      const result = await faucetContract.claimTokens(wallet.address);

      if (result.success) {
        // Update faucet state with claim results
        const currentReward = faucet.claimInfo ? faucetContract.getCurrentReward(faucet.claimInfo.streakCount) : 0;
        setFaucet(prev => ({
          ...prev,
          lastClaimedAmount: currentReward,
          lastTxId: result.txId,
        }));

        // Refresh data to reflect new state
        setTimeout(() => {
          refreshFaucetData();
          refreshBalance(); // Also refresh user balance
        }, 1000);
      }

      return result;
    } catch (error) {
      return {
        txId: '',
        success: false,
        error: `Claim failed: ${error}`,
      };
    }
  };

  const depositTokens = async (amount: number): Promise<ClaimResult> => {
    if (!wallet.address) {
      return {
        txId: '',
        success: false,
        error: 'Wallet not connected',
      };
    }

    try {
      const faucetContract = getFaucetContract();
      const result = await faucetContract.depositTokens(wallet.address, amount);

      if (result.success) {
        // Refresh data to reflect new balances
        setTimeout(() => {
          refreshFaucetData();
          refreshBalance(); // Also refresh user balance
        }, 1000);
      }

      return result;
    } catch (error) {
      return {
        txId: '',
        success: false,
        error: `Deposit failed: ${error}`,
      };
    }
  };

  const transfer = async (options: Omit<TransferOptions, 'sender'>): Promise<ContractCallResult> => {
    if (!wallet.address) {
      return {
        txId: '',
        success: false,
        error: 'Wallet not connected',
      };
    }

    try {
      const contract = getContract();
      const result = await contract.transfer({
        ...options,
        sender: wallet.address,
      });

      // Refresh balance after successful transfer
      if (result.success) {
        setTimeout(() => {
          refreshBalance();
        }, 2000); // Wait a bit for transaction to potentially confirm
      }

      return result;
    } catch (error) {
      return {
        txId: '',
        success: false,
        error: `Transfer failed: ${error}`,
      };
    }
  };

  const getExplorerUrl = (): string => {
    const contract = getContract();
    return contract.getExplorerUrl();
  };

  const switchNetwork = (network: 'mainnet' | 'testnet') => {
    // Save to localStorage
    setStoredNetwork(network);

    setWallet(prev => ({
      ...prev,
      network,
      // Clear balance when switching networks as it may be different
      balance: 0n,
    }));

    // Clear token info and faucet data cache when switching networks
    setTokenInfo(null);
    setFaucet({
      claimInfo: null,
      globalStats: null,
      rewardTiers: [],
      isLoading: false,
      lastClaimedAmount: 0,
      lastTxId: undefined,
    });

    // Clear contract caches for both networks to prevent cross-contamination
    try {
      tbbFaucetContract.clearCache();
      tbbFaucetContract.refreshAnalytics();
    } catch (error) {
      console.warn('Failed to clear mainnet faucet cache:', error);
    }
    
    try {
      tbbFaucetContractTestnet.clearCache(); 
      tbbFaucetContractTestnet.refreshAnalytics();
    } catch (error) {
      console.warn('Failed to clear testnet faucet cache:', error);
    }

    // Reload token info for the new network
    const loadTokenInfo = async () => {
      try {
        const contract = network === 'mainnet' ? tropicalBlueBonoboToken : tropicalBlueBonoboTokenTestnet;
        const info = await contract.getTokenInfo();
        setTokenInfo(info);
      } catch (error) {
        console.error('Failed to load token info for new network:', error);
      }
    };
    loadTokenInfo();

    // Refresh balance and faucet data if connected
    if (wallet.connected && wallet.address) {
      setTimeout(async () => {
        try {
          const contract = network === 'mainnet' ? tropicalBlueBonoboToken : tropicalBlueBonoboTokenTestnet;
          const balance = await contract.getBalance(wallet.address!);
          setWallet(prev => ({ ...prev, balance }));

          // Also refresh faucet data for new network (pass explicit network to avoid race condition)
          refreshFaucetData(false, network);
        } catch (error) {
          console.error('Failed to refresh data for new network:', error);
        }
      }, 100);
    }
  };

  const value: TokenContractContextType = {
    wallet,
    tokenInfo,
    faucet,
    isConnecting,
    connect: connectWallet,
    disconnect: disconnectWallet,
    getBalance,
    transfer,
    refreshBalance,
    refreshTokenInfo,
    refreshFaucetData,
    claimTokens,
    depositTokens,
    getExplorerUrl,
    switchNetwork,
    getFaucetContract,
  };

  return (
    <TokenContractContext.Provider value={value}>
      {children}
    </TokenContractContext.Provider>
  );
};