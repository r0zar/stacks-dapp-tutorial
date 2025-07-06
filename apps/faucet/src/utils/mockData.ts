// Mock data generators for the token homepage

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  description: string;
  image: string;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  network: 'mainnet' | 'testnet';
}

export interface Transaction {
  id: string;
  type: 'transfer' | 'mint' | 'burn';
  from: string;
  to: string;
  amount: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  fee: number;
  memo?: string;
}

export interface AddressBalance {
  address: string;
  balance: number;
  lastSeen: Date;
}

// Mock token information
export const mockTokenInfo: TokenInfo = {
  name: 'Token',
  symbol: 'TKN',
  decimals: 0,
  totalSupply: 10000000000, // 10B
  description: 'A sample SIP-10 token for demonstration purposes',
  image: '/token-logo.png'
};

// Generate mock Stacks addresses
export const generateStacksAddress = (): string => {
  const prefixes = ['SP', 'ST'];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let address = prefix;
  
  for (let i = 0; i < 28; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return address;
};

// Generate mock wallet state
export const generateMockWallet = (): WalletState => ({
  connected: Math.random() > 0.3, // 70% chance of being connected
  address: Math.random() > 0.3 ? generateStacksAddress() : null,
  balance: Math.floor(Math.random() * 1000000) + 100,
  network: Math.random() > 0.5 ? 'mainnet' : 'testnet'
});

// Generate mock transactions
export const generateMockTransactions = (count: number = 10): Transaction[] => {
  const transactions: Transaction[] = [];
  const statuses: Transaction['status'][] = ['pending', 'confirmed', 'failed'];
  const types: Transaction['type'][] = ['transfer', 'mint', 'burn'];
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amount = Math.floor(Math.random() * 10000) + 1;
    
    transactions.push({
      id: `tx-${Date.now()}-${i}`,
      type,
      from: generateStacksAddress(),
      to: generateStacksAddress(),
      amount,
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
      status,
      fee: Math.floor(Math.random() * 100) + 10,
      memo: Math.random() > 0.7 ? 'Payment for services' : undefined
    });
  }
  
  return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Generate mock address balances
export const generateMockAddressBalances = (count: number = 20): AddressBalance[] => {
  const balances: AddressBalance[] = [];
  
  for (let i = 0; i < count; i++) {
    balances.push({
      address: generateStacksAddress(),
      balance: Math.floor(Math.random() * 1000000),
      lastSeen: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
    });
  }
  
  return balances.sort((a, b) => b.balance - a.balance);
};

// Popular/recent addresses for quick access
export const mockPopularAddresses = [
  { address: generateStacksAddress(), label: 'Binance Hot Wallet', balance: 50000000 },
  { address: generateStacksAddress(), label: 'Coinbase Custody', balance: 25000000 },
  { address: generateStacksAddress(), label: 'Treasury Reserve', balance: 100000000 },
  { address: generateStacksAddress(), label: 'DEX Liquidity Pool', balance: 15000000 },
  { address: generateStacksAddress(), label: 'Team Allocation', balance: 75000000 }
];

// Mock network statistics
export const mockNetworkStats = {
  totalHolders: 15847,
  totalTransactions: 234567,
  marketCap: 45000000, // in USD
  circulatingSupply: 8500000000,
  burnedTokens: 500000000,
  averageTransactionFee: 0.002,
  dailyVolume: 1250000
};

// Helper function to get random balance for an address
export const getMockBalance = (address: string): number => {
  // Create a deterministic but pseudo-random balance based on address
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Math.floor((hash * 12345) % 1000000);
};

// Helper function to simulate API delay
export const simulateApiDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};