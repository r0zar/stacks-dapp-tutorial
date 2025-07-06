import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Copy, Clock, Star } from 'lucide-react';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import { mockPopularAddresses, getMockBalance, simulateApiDelay } from '../utils/mockData';
import { formatTokenAmount, formatAddress, isValidStacksAddress, copyToClipboard } from '../utils/formatting';

interface BalanceResult {
  address: string;
  balance: number;
  timestamp: Date;
}

const BalanceChecker: React.FC = () => {
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<BalanceResult[]>([]);
  const [currentResult, setCurrentResult] = useState<BalanceResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchAddress.trim()) {
      setError('Please enter an address');
      return;
    }

    if (!isValidStacksAddress(searchAddress)) {
      setError('Invalid Stacks address format');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      await simulateApiDelay(800);
      
      const balance = getMockBalance(searchAddress);
      const result: BalanceResult = {
        address: searchAddress,
        balance,
        timestamp: new Date()
      };

      setCurrentResult(result);
      
      // Add to recent searches (keep last 5)
      setRecentSearches(prev => {
        const filtered = prev.filter(item => item.address !== searchAddress);
        return [result, ...filtered].slice(0, 5);
      });

    } catch (err) {
      setError('Failed to fetch balance. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePopularAddressClick = (address: string) => {
    setSearchAddress(address);
    setError('');
  };

  const handleCopyAddress = async (address: string) => {
    const success = await copyToClipboard(address);
    if (success) {
      // Could show a toast notification here
      console.log('Address copied to clipboard');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Balance Checker</h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Check the token balance for any Stacks address instantly. Enter an address below or select from popular addresses.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card variant="elevated">
            <div className="space-y-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Enter Stacks address (SP... or ST...)"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyPress={handleKeyPress}
                  error={error}
                  icon={Search}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  loading={isSearching}
                  disabled={!searchAddress.trim()}
                >
                  Search
                </Button>
              </div>

              {/* Search Result */}
              {currentResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-xl border border-primary-200 dark:border-primary-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Balance Result</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Copy}
                      onClick={() => handleCopyAddress(currentResult.address)}
                    >
                      Copy
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                      <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                        {currentResult.address}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Balance</p>
                      <p className="text-2xl font-bold text-primary-600">
                        {formatTokenAmount(currentResult.balance, 'TKN', { compact: true })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Checked</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {currentResult.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Popular Addresses */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  Popular Addresses
                </h3>
                <div className="space-y-2">
                  {mockPopularAddresses.map((item, index) => (
                    <motion.div
                      key={item.address}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                      onClick={() => handlePopularAddressClick(item.address)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {formatAddress(item.address)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary-600">
                          {formatTokenAmount(item.balance, 'TKN', { compact: true })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Recent Searches */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-gray-500" />
              Recent Searches
            </h3>
            
            {recentSearches.length > 0 ? (
              <div className="space-y-3">
                {recentSearches.map((result, index) => (
                  <motion.div
                    key={`${result.address}-${result.timestamp.getTime()}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => handlePopularAddressClick(result.address)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAddress(result.address)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Copy}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyAddress(result.address);
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary-600">
                        {formatTokenAmount(result.balance, 'TKN', { compact: true })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {result.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>No recent searches</p>
                <p className="text-sm">Search for an address to see results here</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default BalanceChecker;