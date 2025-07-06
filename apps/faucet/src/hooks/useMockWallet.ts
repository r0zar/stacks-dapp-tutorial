import { useState, useEffect } from 'react';
import type { WalletState } from '../utils/mockData';
import { generateMockWallet, simulateApiDelay } from '../utils/mockData';

export const useMockWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    balance: 0,
    network: 'testnet'
  });
  
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize wallet state
  useEffect(() => {
    const savedWallet = localStorage.getItem('mockWallet');
    if (savedWallet) {
      setWallet(JSON.parse(savedWallet));
    }
  }, []);

  // Save wallet state to localStorage
  useEffect(() => {
    localStorage.setItem('mockWallet', JSON.stringify(wallet));
  }, [wallet]);

  const connect = async () => {
    setIsConnecting(true);
    await simulateApiDelay(1000); // Simulate connection delay
    
    const newWallet = generateMockWallet();
    setWallet({
      ...newWallet,
      connected: true
    });
    
    setIsConnecting(false);
  };

  const disconnect = () => {
    setWallet({
      connected: false,
      address: null,
      balance: 0,
      network: 'testnet'
    });
  };

  const switchNetwork = (network: 'mainnet' | 'testnet') => {
    setWallet(prev => ({
      ...prev,
      network
    }));
  };

  return {
    wallet,
    isConnecting,
    connect,
    disconnect,
    switchNetwork
  };
};