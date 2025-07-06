import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, Send, Menu, X, Sun, Moon, Droplets, SendHorizontal } from 'lucide-react';
import Hero from './components/Hero';
import BalanceChecker from './components/BalanceChecker';
import TransferForm from './components/TransferForm';
import FaucetClaim from './components/FaucetClaim';
import BatchTransferForm from './components/BatchTransferForm';
import Button from './components/ui/Button';
import { useDarkMode } from './hooks/useDarkMode';
import { useTokenContract } from './contexts/TokenContractContext';
import './index.css';

const navigation = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/balance', label: 'Check Balance', icon: Search },
  { path: '/transfer', label: 'Transfer', icon: Send },
  { path: '/faucet', label: 'Faucet', icon: Droplets },
  { path: '/batch-transfer', label: 'Batch Transfer', icon: SendHorizontal },
];

const Navigation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const { tokenInfo, wallet, switchNetwork } = useTokenContract();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center overflow-hidden">
                {tokenInfo?.tokenUri?.image ? (
                  <img
                    src={tokenInfo.tokenUri.image}
                    alt={`${tokenInfo.name} token`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-sm">T</span>
                )}
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">
                {tokenInfo?.name || 'Token'}
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Network Switcher */}
              <div className="flex items-center space-x-1 ml-4">
                <button
                  onClick={() => switchNetwork('testnet')}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${wallet.network === 'testnet'
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  Testnet
                </button>
                <button
                  onClick={() => switchNetwork('mainnet')}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${wallet.network === 'mainnet'
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  Mainnet
                </button>
              </div>

              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                icon={isDark ? Sun : Moon}
                onClick={toggleDarkMode}
                className="ml-2"
              >
                {isDark ? 'Light' : 'Dark'}
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                icon={isMobileMenuOpen ? X : Menu}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? 'Close' : 'Menu'}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {/* Mobile Network Switcher */}
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Network</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => switchNetwork('testnet')}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${wallet.network === 'testnet'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                      Testnet
                    </button>
                    <button
                      onClick={() => switchNetwork('mainnet')}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${wallet.network === 'mainnet'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                      Mainnet
                    </button>
                  </div>
                </div>

                {/* Mobile Dark Mode Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={isDark ? Sun : Moon}
                  onClick={toggleDarkMode}
                  className="w-full justify-start px-4 py-3"
                >
                  {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main className="relative flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/balance" element={<BalanceChecker />} />
          <Route path="/transfer" element={<TransferForm />} />
          <Route path="/faucet" element={<FaucetClaim />} />
          <Route path="/batch-transfer" element={<BatchTransferForm />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-md flex items-center justify-center overflow-hidden">
                {tokenInfo?.tokenUri?.image ? (
                  <img
                    src={tokenInfo.tokenUri.image}
                    alt={`${tokenInfo.name} token`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-xs">T</span>
                )}
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                {tokenInfo?.name || 'Token'} ({tokenInfo?.symbol || 'TKN'})
              </span>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <span>SIP-10 Token</span>
              <span>•</span>
              <span>Stacks Blockchain</span>
              <span>•</span>
              <span>Demo Application</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>This is a demonstration interface for a SIP-10 token.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Navigation />
    </Router>
  );
};

export default App;