import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { useTokenContract } from '../contexts/TokenContractContext';
import { TBBBatchTransferContract } from 'contracts';

interface ContractStatus {
  name: string;
  contractId: string;
  isDeployed: boolean;
  isLoading: boolean;
  explorerUrl: string;
}

interface ContractStatusIndicatorProps {
  batchTransferContract: TBBBatchTransferContract;
  className?: string;
}

const ContractStatusIndicator: React.FC<ContractStatusIndicatorProps> = ({
  batchTransferContract,
  className = ''
}) => {
  const { wallet } = useTokenContract();
  
  const [contractStatuses, setContractStatuses] = useState<ContractStatus[]>([
    {
      name: 'Token Contract',
      contractId: batchTransferContract.getTokenContractId(),
      isDeployed: false,
      isLoading: true,
      explorerUrl: batchTransferContract.getTokenContractUrl()
    },
    {
      name: 'Batch Transfer Contract',
      contractId: batchTransferContract.getBatchTransferContractId(),
      isDeployed: false,
      isLoading: true,
      explorerUrl: batchTransferContract.getBatchTransferContractUrl()
    }
  ]);

  useEffect(() => {
    const checkAllContracts = async () => {
      try {
        // Use the wrapper's deployment checking methods
        const deploymentStatus = await batchTransferContract.areContractsDeployed();
        
        setContractStatuses([
          {
            name: 'Token Contract',
            contractId: batchTransferContract.getTokenContractId(),
            isDeployed: deploymentStatus.tokenContract,
            isLoading: false,
            explorerUrl: batchTransferContract.getTokenContractUrl()
          },
          {
            name: 'Batch Transfer Contract',
            contractId: batchTransferContract.getBatchTransferContractId(),
            isDeployed: deploymentStatus.batchTransferContract,
            isLoading: false,
            explorerUrl: batchTransferContract.getBatchTransferContractUrl()
          }
        ]);
      } catch (error) {
        console.warn('Error checking contract deployments:', error);
        // Set all to not deployed on error
        setContractStatuses(prev => prev.map(status => ({
          ...status,
          isDeployed: false,
          isLoading: false
        })));
      }
    };

    if (batchTransferContract) {
      checkAllContracts();
    }
  }, [batchTransferContract]);

  const getStatusIcon = (status: ContractStatus) => {
    if (status.isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
    }
    
    if (status.isDeployed) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusText = (status: ContractStatus) => {
    if (status.isLoading) return 'Checking...';
    return status.isDeployed ? 'Deployed' : 'Not Deployed';
  };

  const getStatusColor = (status: ContractStatus) => {
    if (status.isLoading) return 'text-gray-500';
    return status.isDeployed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const allDeployed = contractStatuses.every(s => s.isDeployed && !s.isLoading);
  const anyLoading = contractStatuses.some(s => s.isLoading);

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Contract Status
        </h4>
        <div className="flex items-center space-x-1">
          {anyLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : allDeployed ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-xs font-medium ${
            anyLoading ? 'text-gray-500' : 
            allDeployed ? 'text-green-600 dark:text-green-400' : 
            'text-red-600 dark:text-red-400'
          }`}>
            {anyLoading ? 'Checking...' : allDeployed ? 'All Ready' : 'Incomplete'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {contractStatuses.map((status, index) => (
          <motion.div
            key={status.contractId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center space-x-2">
              {getStatusIcon(status)}
              <span className="text-gray-600 dark:text-gray-400">
                {status.name}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={getStatusColor(status)}>
                {getStatusText(status)}
              </span>
              {status.isDeployed && (
                <button
                  onClick={() => window.open(status.explorerUrl, '_blank')}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {!allDeployed && !anyLoading && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Some contracts are not deployed. Batch transfers may not work until all contracts are available.
          </p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div>Network: <span className="font-mono text-gray-600 dark:text-gray-300">{wallet.network}</span></div>
          <div>Token: <span className="font-mono text-gray-600 dark:text-gray-300">{batchTransferContract.getTokenContractId().split('.')[1] || 'token'}</span></div>
          <div>Batch: <span className="font-mono text-gray-600 dark:text-gray-300">{batchTransferContract.getBatchTransferContractId().split('.')[1] || 'batch-transfer'}</span></div>
        </div>
      </div>
    </div>
  );
};

export default ContractStatusIndicator;