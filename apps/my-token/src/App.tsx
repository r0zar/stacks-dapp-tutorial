import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Send, Menu, X, Sun, Moon } from 'lucide-react';
import Hero from './components/Hero';
import BalanceChecker from './components/BalanceChecker';
import TransferForm from './components/TransferForm';
import Button from './components/ui/Button';
import { useDarkMode } from './hooks/useDarkMode';
import './index.css';

type Page = 'home' | 'balance' | 'transfer' | 'stats';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  const navigation = [
    { id: 'home', label: 'Home', icon: Home, component: Hero },
    { id: 'balance', label: 'Check Balance', icon: Search, component: BalanceChecker },
    { id: 'transfer', label: 'Transfer', icon: Send, component: TransferForm },
  ];

  const CurrentComponent = navigation.find(nav => nav.id === currentPage)?.component || Hero;

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">Token</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handlePageChange(item.id as Page)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 shadow-sm text-gray-300 dark:text-gray-300 disabled'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

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
                  const isActive = currentPage === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handlePageChange(item.id as Page)}
                      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

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
      <motion.main
        key={currentPage}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="relative flex-1 flex flex-col"
      >
        <CurrentComponent />
      </motion.main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">T</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">Token (TKN)</span>
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
            <p>This is a demonstration interface for a SIP-10 token. All interactions are simulated.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;