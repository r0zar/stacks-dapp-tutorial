import { isValidStacksAddress } from './validators';
import { Cl, ClarityValue, Pc } from '@stacks/transactions';
import { request } from '@stacks/connect';
import { CallContractParams } from '@stacks/connect/dist/types/methods';

// Type definitions for batch transfer functionality
export interface BatchTransferRecipient {
    address: string;
    amount: number;
}

export interface BatchTransferRequest {
    recipients: BatchTransferRecipient[];
    sender: string;
    memo?: string;
}

export interface BatchTransferResult {
    txId: string;
    success: boolean;
    error?: string;
}

export interface BatchTransferSummary {
    totalRecipients: number;
    totalAmount: number;
    validRecipients: number;
    invalidRecipients: number;
    averageAmount: number;
    largestTransfer: number;
    smallestTransfer: number;
}

export interface RecipientValidation {
    address: string;
    amount: number;
    isValid: boolean;
    error?: string;
}

export interface CSVParseResult {
    recipients: BatchTransferRecipient[];
    errors: string[];
    validCount: number;
    invalidCount: number;
}

export interface ContractError {
    code: number;
    message: string;
}

export const CONTRACT_ERRORS = {
    NOT_ENOUGH_BALANCE: { code: 1, message: 'Insufficient balance' },
    SENDER_RECIPIENT: { code: 2, message: 'Cannot send to same address' },
    INVALID_AMOUNT: { code: 3, message: 'Invalid amount (must be > 0)' },
    NOT_TOKEN_OWNER: { code: 4, message: 'Not authorized to transfer tokens' }
} as const;

// Contract details by network
const CONTRACT_ADDRESSES = {
    mainnet: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS',
    testnet: 'ST2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2SYCBMRR',
} as const;

const TOKEN_CONTRACT_NAME = 'tropical-blue-bonobo';
const BATCH_TRANSFER_CONTRACT_NAME = 'available-purple-squid';

type NetworkType = 'mainnet' | 'testnet';

/**
 * TBB Batch Transfer Contract Wrapper
 * Provides batch transfer functionality with proper read-only vs public function distinction
 */
export class TBBBatchTransferContract {
    private readonly network: NetworkType;

    // Constants
    private readonly MAX_RECIPIENTS = 200;
    private readonly MIN_AMOUNT = 1;
    private readonly BASE_FEE = 0.0003; // STX per transaction
    private readonly FEE_PER_RECIPIENT = 0.0001; // STX per additional recipient

    constructor(network: NetworkType = 'testnet') {
        this.network = network;
    }

    private get contractAddress(): string {
        return CONTRACT_ADDRESSES[this.network];
    }

    private get fullBatchTransferContractId(): `${string}.${string}` {
        return `${this.contractAddress}.${BATCH_TRANSFER_CONTRACT_NAME}`;
    }

    private get fullTokenContractId(): `${string}.${string}` {
        return `${this.contractAddress}.${TOKEN_CONTRACT_NAME}`;
    }

    // READ-ONLY FUNCTIONS (return actual data)

    /**
     * Validate individual recipients
     */
    validateRecipients(recipients: BatchTransferRecipient[]): RecipientValidation[] {
        return recipients.map(recipient => {
            const validation: RecipientValidation = {
                address: recipient.address,
                amount: recipient.amount,
                isValid: true
            };

            // Validate address
            if (!recipient.address) {
                validation.isValid = false;
                validation.error = 'Address is required';
            } else if (!isValidStacksAddress(recipient.address)) {
                validation.isValid = false;
                validation.error = 'Invalid Stacks address format';
            }

            // Validate amount
            if (!recipient.amount || recipient.amount <= 0) {
                validation.isValid = false;
                validation.error = validation.error
                    ? `${validation.error}; Amount must be greater than 0`
                    : 'Amount must be greater than 0';
            } else if (recipient.amount < this.MIN_AMOUNT) {
                validation.isValid = false;
                validation.error = validation.error
                    ? `${validation.error}; Minimum amount is ${this.MIN_AMOUNT}`
                    : `Minimum amount is ${this.MIN_AMOUNT}`;
            }

            return validation;
        });
    }

    /**
     * Calculate total amount for batch transfer
     */
    calculateTotalAmount(recipients: BatchTransferRecipient[]): number {
        return recipients.reduce((total, recipient) => {
            return total + (recipient.amount || 0);
        }, 0);
    }

    /**
     * Get maximum recipients limit
     */
    getMaxRecipientsLimit(): number {
        return this.MAX_RECIPIENTS;
    }

    /**
     * Calculate estimated transaction fee
     */
    getBatchTransferFee(recipientCount: number): number {
        return this.BASE_FEE + (this.FEE_PER_RECIPIENT * Math.max(0, recipientCount - 1));
    }

    /**
     * Generate comprehensive batch summary
     */
    generateBatchSummary(recipients: BatchTransferRecipient[]): BatchTransferSummary {
        const validations = this.validateRecipients(recipients);
        const validRecipients = validations.filter(v => v.isValid);
        const amounts = validRecipients.map(v => v.amount);

        return {
            totalRecipients: recipients.length,
            totalAmount: this.calculateTotalAmount(recipients),
            validRecipients: validRecipients.length,
            invalidRecipients: validations.length - validRecipients.length,
            averageAmount: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
            largestTransfer: amounts.length > 0 ? Math.max(...amounts) : 0,
            smallestTransfer: amounts.length > 0 ? Math.min(...amounts) : 0
        };
    }

    /**
     * Validate batch transfer request
     */
    validateBatchRequest(request: BatchTransferRequest): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate sender
        if (!request.sender) {
            errors.push('Sender address is required');
        } else if (!isValidStacksAddress(request.sender)) {
            errors.push('Invalid sender address format');
        }

        // Validate recipients array
        if (!request.recipients || request.recipients.length === 0) {
            errors.push('At least one recipient is required');
        } else if (request.recipients.length > this.MAX_RECIPIENTS) {
            errors.push(`Maximum ${this.MAX_RECIPIENTS} recipients allowed`);
        }

        // Validate individual recipients
        if (request.recipients) {
            const recipientValidations = this.validateRecipients(request.recipients);
            const invalidRecipients = recipientValidations.filter(v => !v.isValid);

            if (invalidRecipients.length > 0) {
                errors.push(`${invalidRecipients.length} recipients have validation errors`);
            }

            // Check for duplicate recipients
            const addresses = request.recipients.map(r => r.address.toLowerCase());
            const uniqueAddresses = new Set(addresses);
            if (addresses.length !== uniqueAddresses.size) {
                errors.push('Duplicate recipient addresses detected');
            }

            // Check if sender is sending to themselves
            const sendingToSelf = request.recipients.some(r =>
                r.address.toLowerCase() === request.sender.toLowerCase()
            );
            if (sendingToSelf) {
                errors.push('Cannot send tokens to yourself');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Parse CSV data into recipients
     */
    parseCSVData(csvContent: string): CSVParseResult {
        const result: CSVParseResult = {
            recipients: [],
            errors: [],
            validCount: 0,
            invalidCount: 0
        };

        try {
            const lines = csvContent.trim().split('\n');

            if (lines.length === 0) {
                result.errors.push('CSV file is empty');
                return result;
            }

            // Parse header
            const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
            const addressIndex = headers.indexOf('address');
            const amountIndex = headers.indexOf('amount');

            if (addressIndex === -1) {
                result.errors.push('CSV must have an "address" column');
                return result;
            }

            if (amountIndex === -1) {
                result.errors.push('CSV must have an "amount" column');
                return result;
            }

            // Parse data rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue; // Skip empty lines

                const values = line.split(',').map(v => v.trim());

                if (values.length < Math.max(addressIndex, amountIndex) + 1) {
                    result.errors.push(`Row ${i + 1}: Insufficient columns`);
                    continue;
                }

                const address = values[addressIndex];
                const amountStr = values[amountIndex];
                const amount = parseFloat(amountStr);

                if (!address) {
                    result.errors.push(`Row ${i + 1}: Missing address`);
                    result.invalidCount++;
                    continue;
                }

                if (isNaN(amount) || amount <= 0) {
                    result.errors.push(`Row ${i + 1}: Invalid amount "${amountStr}"`);
                    result.invalidCount++;
                    continue;
                }

                // Add valid recipient
                result.recipients.push({ address, amount });
                result.validCount++;
            }

            // Check recipient limit
            if (result.recipients.length > this.MAX_RECIPIENTS) {
                result.errors.push(`Too many recipients: ${result.recipients.length}. Maximum is ${this.MAX_RECIPIENTS}`);
                result.recipients = result.recipients.slice(0, this.MAX_RECIPIENTS);
                result.validCount = this.MAX_RECIPIENTS;
            }

        } catch (error) {
            result.errors.push(`CSV parsing error: ${error}`);
        }

        return result;
    }

    /**
     * Generate CSV template for download
     */
    generateCSVTemplate(): string {
        return [
            'address,amount',
            'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM,1000000',
            'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG,5000000',
            'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC,10000000',
            'ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ,25000000',
            'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5,50000000'
        ].join('\n');
    }

    /**
     * Get network-specific contract information
     */
    getContractInfo() {
        return {
            network: this.network,
            batchTransferContractId: this.getBatchTransferContractId(),
            tokenContractId: this.getTokenContractId(),
            maxRecipients: this.MAX_RECIPIENTS,
            baseFee: this.BASE_FEE,
            feePerRecipient: this.FEE_PER_RECIPIENT
        };
    }

    /**
     * Get the explorer URL for a transaction
     */
    getTransactionUrl(txId: string): string {
        return `https://explorer.stacks.co/txid/${txId}?chain=${this.network}`;
    }

    /**
     * Get the explorer URL for the batch transfer contract
     */
    getBatchTransferContractUrl(): string {
        return `https://explorer.stacks.co/txid/${this.getBatchTransferContractId()}?chain=${this.network}`;
    }

    /**
     * Get the explorer URL for the token contract
     */
    getTokenContractUrl(): string {
        return `https://explorer.stacks.co/txid/${this.getTokenContractId()}?chain=${this.network}`;
    }

    /**
     * Decode contract error from Clarity response
     */
    decodeContractError(errorCode: number): ContractError | null {
        switch (errorCode) {
            case 1:
                return CONTRACT_ERRORS.NOT_ENOUGH_BALANCE;
            case 2:
                return CONTRACT_ERRORS.SENDER_RECIPIENT;
            case 3:
                return CONTRACT_ERRORS.INVALID_AMOUNT;
            case 4:
                return CONTRACT_ERRORS.NOT_TOKEN_OWNER;
            default:
                return { code: errorCode, message: `Unknown error code: ${errorCode}` };
        }
    }

    /**
     * Parse contract response and extract meaningful error information
     */
    parseContractResponse(response: any): { success: boolean; error?: string; errorCode?: number } {
        if (response.type === 'ok') {
            return { success: true };
        } else if (response.type === 'err') {
            const errorCode = response.value.type === 'uint' ? Number(response.value.value) : 0;
            const contractError = this.decodeContractError(errorCode);
            return {
                success: false,
                error: contractError?.message || 'Unknown contract error',
                errorCode
            };
        }

        return { success: false, error: 'Invalid contract response' };
    }

    // CONTRACT DEPLOYMENT CHECKING

    /**
     * Check if a contract is deployed on the network
     */
    async checkContractDeployment(contractId: string): Promise<boolean> {
        try {
            const apiUrl = this.network === 'mainnet'
                ? 'https://api.mainnet.hiro.so'
                : 'https://api.testnet.hiro.so';

            const response = await fetch(`${apiUrl}/extended/v1/contract/${contractId}`);

            // Return true if contract is found (200), false if not found (404) or other errors
            return response.status === 200;
        } catch (error) {
            console.warn(`Error checking contract ${contractId}:`, error);
            return false;
        }
    }

    /**
     * Check if the token contract is deployed
     */
    async isTokenContractDeployed(): Promise<boolean> {
        return this.checkContractDeployment(this.getTokenContractId());
    }

    /**
     * Check if the batch transfer contract is deployed
     */
    async isBatchTransferContractDeployed(): Promise<boolean> {
        return this.checkContractDeployment(this.getBatchTransferContractId());
    }

    /**
     * Check if both contracts required for batch transfers are deployed
     */
    async areContractsDeployed(): Promise<{
        tokenContract: boolean;
        batchTransferContract: boolean;
        allDeployed: boolean;
    }> {
        const [tokenContract, batchTransferContract] = await Promise.all([
            this.isTokenContractDeployed(),
            this.isBatchTransferContractDeployed()
        ]);

        return {
            tokenContract,
            batchTransferContract,
            allDeployed: tokenContract && batchTransferContract
        };
    }

    // CLARITY CONTRACT INTEGRATION

    /**
     * Create a single recipient tuple in Clarity format
     */
    createClarityRecipient(recipient: BatchTransferRecipient, memo?: string): ClarityValue {
        return Cl.tuple({
            to: Cl.principal(recipient.address),
            amount: Cl.uint(recipient.amount),
            memo: memo ? Cl.some(Cl.bufferFromUtf8(memo)) : Cl.none()
        });
    }

    /**
     * Convert recipients to Clarity list format
     */
    createClarityRecipientsList(recipients: BatchTransferRecipient[], memo?: string): ClarityValue {
        const clarityRecipients = recipients.map(recipient =>
            this.createClarityRecipient(recipient, memo)
        );

        return Cl.list(clarityRecipients);
    }

    /**
     * Create contract call arguments for send-many function
     */
    createContractCallArgs(recipients: BatchTransferRecipient[], memo?: string): ClarityValue[] {
        return [this.createClarityRecipientsList(recipients, memo)];
    }

    /**
     * Get the full contract ID for batch transfers
     */
    getBatchTransferContractId(): `${string}.${string}` {
        return this.fullBatchTransferContractId;
    }

    /**
     * Get the full contract ID for the token
     */
    getTokenContractId(): `${string}.${string}` {
        return this.fullTokenContractId;
    }

    /**
     * Get the function name for batch transfers
     */
    getFunctionName(): string {
        return 'send-many';
    }

    /**
     * Prepare batch transfer for contract call
     * Returns the data needed to make the actual contract call
     */
    prepareBatchTransfer(request: BatchTransferRequest): {
        contractId: string;
        functionName: string;
        functionArgs: ClarityValue[];
        validation: { isValid: boolean; errors: string[] };
        summary: BatchTransferSummary;
    } {
        const validation = this.validateBatchRequest(request);
        const summary = this.generateBatchSummary(request.recipients);

        return {
            contractId: this.getBatchTransferContractId(),
            functionName: this.getFunctionName(),
            functionArgs: this.createContractCallArgs(request.recipients, request.memo),
            validation,
            summary
        };
    }

    // PUBLIC FUNCTIONS (return txId only)

    /**
     * Execute batch transfer using Stacks Connect
     * Returns transaction ID only - success/failure determined later
     */
    async executeBatchTransfer(requestParams: BatchTransferRequest): Promise<BatchTransferResult> {
        try {
            // Validate request
            const validation = this.validateBatchRequest(requestParams);
            if (!validation.isValid) {
                return {
                    txId: '',
                    success: false,
                    error: validation.errors.join('; ')
                };
            }

            const { recipients, sender, memo } = requestParams;

            // Build function arguments
            const functionArgs = this.createContractCallArgs(recipients, memo);

            // Calculate total amount for post conditions
            const totalAmount = this.calculateTotalAmount(recipients);

            // Build post conditions to ensure the sender has enough tokens
            const postConditions = [
                Pc.principal(sender)
                    .willSendEq(totalAmount)
                    .ft(this.getTokenContractId(), 'TKN')
            ];

            const params: CallContractParams = {
                contract: this.getBatchTransferContractId(),
                functionName: this.getFunctionName(),
                functionArgs,
                network: this.network,
                postConditionMode: 'deny',
                postConditions,
            };

            const response = await request('stx_callContract', params);

            console.log('Batch transfer response:', response);

            return {
                txId: response.txid || '',
                success: true,
            };

        } catch (error) {
            console.error('Batch transfer error:', error);
            return {
                txId: '',
                success: false,
                error: `Batch transfer failed: ${error}`,
            };
        }
    }

    /**
     * Execute individual transfer (wrapper around batch transfer)
     */
    async executeTransfer(sender: string, recipient: string, amount: number, memo?: string): Promise<BatchTransferResult> {
        return this.executeBatchTransfer({
            recipients: [{ address: recipient, amount }],
            sender,
            memo
        });
    }
}

// Export singleton instances for both networks
export const tbbBatchTransferContract = new TBBBatchTransferContract('mainnet');
export const tbbBatchTransferContractTestnet = new TBBBatchTransferContract('testnet');

// Export the class for custom instances
export default TBBBatchTransferContract;