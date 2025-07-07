import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import { formatLargeTokenAmount } from '../utils/formatting';

interface DepositTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number) => Promise<void>;
  isDepositing: boolean;
  tokenSymbol?: string;
  userBalance?: bigint;
  faucetBalance?: number;
  totalSupply?: number;
  isLoadingBalance?: boolean;
}

const DepositTokensModal: React.FC<DepositTokensModalProps> = ({
  isOpen,
  onClose,
  onDeposit,
  isDepositing,
  tokenSymbol = 'TKN',
  userBalance = 0n,
  faucetBalance = 0,
  totalSupply = 0,
  isLoadingBalance = false
}) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setError('');
  };

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);

    if (!depositAmount || depositAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    const userBalanceNumber = Number(userBalance);
    console.log('Deposit validation - Amount:', depositAmount, 'User Balance:', userBalanceNumber, 'Raw Balance:', userBalance);

    if (depositAmount > userBalanceNumber) {
      setError('Insufficient balance');
      return;
    }

    try {
      await onDeposit(depositAmount);
      setAmount('');
      onClose();
    } catch (error) {
      setError(`Deposit failed: ${error}`);
    }
  };

  const handleMaxAmount = () => {
    const maxAmount = Number(userBalance);
    setAmount(maxAmount.toString());
    setError('');
  };

  const currentPercentage = totalSupply > 0 ? (faucetBalance / totalSupply) * 100 : 0;
  const afterDepositBalance = faucetBalance + parseFloat(amount || '0');
  const afterDepositPercentage = totalSupply > 0 ? (afterDepositBalance / totalSupply) * 100 : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Deposit Tokens
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add tokens to the faucet
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Current Faucet Status */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Current Faucet Status
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Balance</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatLargeTokenAmount(faucetBalance)} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Percentage</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Deposit Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Deposit Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Enter amount to deposit"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white"
                    disabled={isDepositing}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{tokenSymbol}</span>
                    <button
                      onClick={handleMaxAmount}
                      className="text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-1 rounded hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isDepositing || isLoadingBalance}
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {isLoadingBalance ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                      <span>Loading balance...</span>
                    </div>
                  ) : (
                    <>
                      Your balance: {formatLargeTokenAmount(Number(userBalance))} {tokenSymbol}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-gray-400 mt-1">
                          Debug: Raw balance = {userBalance?.toString() || 'undefined'}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Deposit Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-3">
                    After Deposit
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 dark:text-green-400">New Balance</span>
                      <span className="font-medium text-green-700 dark:text-green-300">
                        {formatLargeTokenAmount(afterDepositBalance)} {tokenSymbol}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 dark:text-green-400">New Percentage</span>
                      <span className="font-medium text-green-700 dark:text-green-300">
                        {afterDepositPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}

              {/* Info Note */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  <strong>Note:</strong> Deposited tokens will be available for other users to claim from the faucet.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isDepositing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeposit}
                loading={isDepositing}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                disabled={!amount || parseFloat(amount) <= 0 || isLoadingBalance}
              >
                {isDepositing ? 'Depositing...' : isLoadingBalance ? 'Loading Balance...' : 'Deposit Tokens'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DepositTokensModal;