import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Globe, TrendingUp, Users } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useTokenContract } from '../contexts/TokenContractContext';
import { formatTokenAmount, formatAddress } from '../utils/formatting';

interface HeroProps {
  onNavigate?: (page: 'balance' | 'transfer') => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const { wallet, tokenInfo, isConnecting, connect, disconnect, getExplorerUrl, refreshBalance } = useTokenContract();

  const handleViewOnExplorer = () => {
    const explorerUrl = getExplorerUrl();
    window.open(explorerUrl, '_blank');
  };

  const handleCheckBalance = async () => {
    if (wallet.connected) {
      await refreshBalance();
    }
    onNavigate?.('balance');
  };

  const handleTransferTokens = () => {
    onNavigate?.('transfer');
  };

  const stats = [
    {
      label: 'Total Supply',
      value: tokenInfo ? formatTokenAmount(Number(tokenInfo.totalSupply), 'TKN', { compact: true }) : '...',
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      label: 'Decimals',
      value: tokenInfo ? tokenInfo.decimals.toString() : '...',
      icon: Users,
      color: 'text-green-600'
    },
    {
      label: 'Network',
      value: wallet.network === 'mainnet' ? 'Mainnet' : 'Testnet',
      icon: Globe,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="relative flex-1 bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden transition-colors duration-200">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 dark:bg-primary-900 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-100 dark:bg-secondary-900 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow"></div>
      </div>

      <div className="relative z-10 px-6 py-12 min-h-full flex flex-col justify-center">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                {tokenInfo?.tokenUri?.image ? (
                  <img
                    src={tokenInfo.tokenUri.image}
                    alt={`${tokenInfo.name} token`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {tokenInfo?.symbol?.[0] || 'T'}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tokenInfo?.name || 'Loading...'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {tokenInfo?.symbol || 'TKN'}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <div className={`w-2 h-2 rounded-full ${wallet.network === 'mainnet' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="capitalize">{wallet.network}</span>
              </div>

              {wallet.connected ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatTokenAmount(Number(wallet.balance), 'TKN', { compact: true })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatAddress(wallet.address!)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnect}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  icon={Wallet}
                  onClick={connect}
                  loading={isConnecting}
                >
                  Connect Wallet
                </Button>
              )}
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Token Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card variant="glass" className="h-full">
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {tokenInfo?.name || 'Tropical Blue Bonobo Token'}
                      </h2>
                      <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-sm font-medium rounded-full">
                        SIP-10
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
                      A SIP-10 fungible token on the Stacks blockchain, enabling secure and fast transfers with built-in smart contract functionality.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats.map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="text-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg backdrop-blur-sm"
                      >
                        <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <Card variant="elevated">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    fullWidth
                    variant="primary"
                    onClick={handleTransferTokens}
                    disabled={!wallet.connected}
                  >
                    Transfer Tokens
                  </Button>
                  <Button
                    fullWidth
                    variant="outline"
                    onClick={handleCheckBalance}
                  >
                    Check Balance
                  </Button>
                  <Button
                    fullWidth
                    variant="ghost"
                    onClick={handleViewOnExplorer}
                  >
                    View on Explorer
                  </Button>
                </div>
              </Card>

              {wallet.connected && (
                <Card variant="elevated">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Balance</h3>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-primary-600 mb-2">
                      {formatTokenAmount(Number(wallet.balance), 'TKN', { compact: true })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {wallet.isLoading ? 'Updating...' : 'Current Balance'}
                    </p>
                  </div>
                </Card>
              )}

              {/* Token Info Card */}
              {tokenInfo && (
                <Card variant="elevated">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Token Details</h3>

                  {/* Token Image */}
                  {tokenInfo.tokenUri?.image && (
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                        <img
                          src={tokenInfo.tokenUri.image}
                          alt={`${tokenInfo.name} token`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Name</span>
                      <span className="font-medium text-gray-900 dark:text-white">{tokenInfo.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Symbol</span>
                      <span className="font-medium text-gray-900 dark:text-white">{tokenInfo.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Decimals</span>
                      <span className="font-medium text-gray-900 dark:text-white">{tokenInfo.decimals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Supply</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatTokenAmount(Number(tokenInfo.totalSupply), tokenInfo.symbol)}
                      </span>
                    </div>
                    {tokenInfo.tokenUri?.description && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400 text-xs">Description</span>
                        <p className="text-gray-900 dark:text-white text-sm mt-1">{tokenInfo.tokenUri.description}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;