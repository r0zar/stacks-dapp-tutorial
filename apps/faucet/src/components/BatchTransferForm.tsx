import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Upload, Download, Users, SendHorizontal } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import { useTokenContract } from '../contexts/TokenContractContext';
import { formatLargeTokenAmount, formatAddress } from '../utils/formatting';
import {
  tbbBatchTransferContract,
  tbbBatchTransferContractTestnet,
  type BatchTransferRecipient,
  type BatchTransferRequest,
} from 'contracts';

interface Recipient {
  id: string;
  address: string;
  amount: number;
  isValid: boolean;
}

const BatchTransferForm: React.FC = () => {
  const { wallet, connect, isConnecting, getExplorerUrl } = useTokenContract();

  // Contract instance
  const batchTransferContract = wallet.network === 'mainnet' ? tbbBatchTransferContract : tbbBatchTransferContractTestnet;

  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: '1', address: '', amount: 0, isValid: false }
  ]);
  const [currentStep, setCurrentStep] = useState<'input' | 'review' | 'execute'>('input');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<{ success: boolean; txId?: string; error?: string } | null>(null);

  const maxAmount = Number(wallet.balance);
  const totalAmount = recipients.reduce((sum, r) => sum + (r.amount || 0), 0);
  const validRecipients = recipients.filter(r => r.address && r.amount > 0 && r.isValid);

  const addRecipient = () => {
    const newId = (Math.max(...recipients.map(r => parseInt(r.id))) + 1).toString();
    setRecipients([...recipients, { id: newId, address: '', amount: 0, isValid: false }]);
    // Clear any upload messages when manually adding recipients
    setUploadError('');
    setUploadSuccess('');
  };

  const removeRecipient = (id: string) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter(r => r.id !== id));
    }
  };

  const updateRecipient = (id: string, field: keyof Recipient, value: any) => {
    setRecipients(recipients.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        if (field === 'address') {
          // Use contract validation
          const validation = batchTransferContract.validateRecipients([{
            address: value,
            amount: r.amount
          }]);
          updated.isValid = validation[0]?.isValid || false;
        }
        return updated;
      }
      return r;
    }));
  };

  const handleExecuteBatch = async () => {
    if (!wallet.address) return;

    setIsProcessing(true);
    setExecutionResult(null);

    try {
      // Convert recipients to contract format
      const contractRecipients: BatchTransferRecipient[] = validRecipients.map(r => ({
        address: r.address,
        amount: r.amount
      }));

      const batchRequest: BatchTransferRequest = {
        recipients: contractRecipients,
        sender: wallet.address,
        memo: 'Batch transfer via faucet app'
      };

      // Execute batch transfer through contract
      const result = await batchTransferContract.executeBatchTransfer(batchRequest);

      if (result.success) {
        setExecutionResult({
          success: true,
          txId: result.txId
        });
        setCurrentStep('execute');
      } else {
        setExecutionResult({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        error: `Transfer failed: ${error}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getQuickAmounts = () => [
    { label: '1M', value: 1_000_000 },
    { label: '5M', value: 5_000_000 },
    { label: '10M', value: 10_000_000 },
    { label: '25M', value: 25_000_000 },
    { label: '50M', value: 50_000_000 }
  ];

  const downloadTemplate = () => {
    // Use contract method to generate CSV template
    const csvContent = batchTransferContract.generateCSVTemplate();

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'batch_transfer_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        // Use contract method to parse CSV
        const parseResult = batchTransferContract.parseCSVData(text);

        if (parseResult.errors.length > 0) {
          setUploadError(`CSV parsing errors: ${parseResult.errors.join('; ')}`);
          return;
        }

        // Convert contract recipients to UI format
        const uiRecipients: Recipient[] = parseResult.recipients.map((r, index) => ({
          id: (index + 1).toString(),
          address: r.address,
          amount: r.amount,
          isValid: batchTransferContract.validateRecipients([r])[0]?.isValid || false
        }));

        setRecipients(uiRecipients);
        setUploadError('');
        setUploadSuccess(`Successfully loaded ${parseResult.validCount} recipients from CSV`);

        // Clear success message after 3 seconds
        setTimeout(() => setUploadSuccess(''), 3000);
      } catch (error) {
        console.warn('Error parsing CSV:', error);
        setUploadError('Invalid CSV format. Please use: address,amount');
        setUploadSuccess('');
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be uploaded again
    event.target.value = '';
  };

  // Removed parseCSV function - now using contract method

  if (currentStep === 'execute') {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {executionResult?.success ? 'Transfer Successful!' : 'Transfer Failed'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {executionResult?.success
              ? 'Your batch transfer has been submitted to the blockchain'
              : 'There was an error processing your batch transfer'
            }
          </p>
        </motion.div>

        <Card variant="elevated" className="text-center">
          {executionResult?.success ? (
            <div className="space-y-6">
              <div className="text-6xl mb-4">✅</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Transaction Submitted
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Successfully sent {formatLargeTokenAmount(totalAmount)} tokens to {validRecipients.length} recipients
                </p>
                {executionResult.txId && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Transaction ID:</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                      {executionResult.txId}
                    </p>
                  </div>
                )}
                <div className="flex space-x-4 justify-center">
                  {executionResult.txId && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(getExplorerUrl(), '_blank')}
                    >
                      View on Explorer
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setCurrentStep('input');
                      setExecutionResult(null);
                      setRecipients([{ id: '1', address: '', amount: 0, isValid: false }]);
                    }}
                  >
                    New Transfer
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-6xl mb-4">❌</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Transfer Failed
                </h3>
                <p className="text-red-600 dark:text-red-400 mb-4">
                  {executionResult?.error || 'Unknown error occurred'}
                </p>
                <div className="flex space-x-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentStep('review');
                      setExecutionResult(null);
                    }}
                  >
                    Back to Review
                  </Button>
                  <Button
                    onClick={() => {
                      setCurrentStep('input');
                      setExecutionResult(null);
                    }}
                  >
                    Start Over
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (currentStep === 'review') {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Review Batch Transfer</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Review all recipients before executing the batch transfer
          </p>
        </motion.div>

        <Card variant="elevated">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Transfer Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {validRecipients.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Recipients</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatLargeTokenAmount(totalAmount)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatLargeTokenAmount(maxAmount - totalAmount)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Remaining Balance</div>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto mb-6">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">Recipient</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {validRecipients.map((recipient, index) => (
                  <tr key={recipient.id}>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">
                      {formatAddress(recipient.address)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">
                      {formatLargeTokenAmount(recipient.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('input')}
              className="flex-1"
            >
              Back to Edit
            </Button>
            <Button
              onClick={handleExecuteBatch}
              loading={isProcessing}
              className="flex-1"
              disabled={totalAmount > maxAmount}
            >
              {isProcessing ? 'Processing...' : `Execute Batch Transfer`}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Batch Transfer</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Send tokens to up to {batchTransferContract.getMaxRecipientsLimit()} recipients in a single transaction
        </p>
      </motion.div>

      {!wallet.connected ? (
        <Card variant="elevated" className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect your wallet to start batch transferring tokens
          </p>
          <Button onClick={connect} loading={isConnecting} size="lg">
            Connect Wallet
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Balance Info */}
          <Card variant="elevated">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Balance</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatLargeTokenAmount(maxAmount)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total to Send</div>
                <div className={`text-xl font-bold ${totalAmount > maxAmount ? 'text-red-600' : 'text-gray-900 dark:text-white'
                  }`}>
                  {formatLargeTokenAmount(totalAmount)}
                </div>
              </div>
            </div>
          </Card>

          {/* Recipients */}
          <Card variant="elevated">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recipients ({recipients.length}/{batchTransferContract.getMaxRecipientsLimit()})
              </h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={downloadTemplate}
                >
                  Template
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="csv-upload"
                  />
                  <Button variant="outline" size="sm" icon={Upload}>
                    Upload CSV
                  </Button>
                </div>
              </div>
            </div>

            {/* Upload Messages */}
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
              </div>
            )}

            {uploadSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{uploadSuccess}</p>
              </div>
            )}

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recipients.map((recipient, index) => (
                <div key={recipient.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <Input
                        placeholder="ST... or SP... address"
                        value={recipient.address}
                        onChange={(e) => updateRecipient(recipient.id, 'address', e.target.value)}
                        error={recipient.address && !recipient.isValid ? 'Invalid address' : undefined}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => removeRecipient(recipient.id)}
                      disabled={recipients.length === 1}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Amount (tokens)"
                        value={recipient.amount || ''}
                        onChange={(e) => updateRecipient(recipient.id, 'amount', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="1000000"
                      />
                    </div>
                    <div className="flex space-x-1">
                      {getQuickAmounts().map(({ label, value }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => updateRecipient(recipient.id, 'amount', value)}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={addRecipient}
                icon={Plus}
                disabled={recipients.length >= batchTransferContract.getMaxRecipientsLimit()}
              >
                Add Recipient
              </Button>

              <Button
                onClick={() => setCurrentStep('review')}
                disabled={validRecipients.length === 0 || totalAmount > maxAmount}
                icon={SendHorizontal}
              >
                Review Transfer ({validRecipients.length} recipients)
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BatchTransferForm;