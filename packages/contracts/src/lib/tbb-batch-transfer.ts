import { isValidStacksAddress } from './validators';

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
            contractName: 'tbb-batch-transfer',
            maxRecipients: this.MAX_RECIPIENTS,
            baseFee: this.BASE_FEE,
            feePerRecipient: this.FEE_PER_RECIPIENT
        };
    }

    // PUBLIC FUNCTIONS (return txId only)

    /**
     * Execute batch transfer
     * Returns transaction ID only - success/failure determined later
     */
    async executeBatchTransfer(request: BatchTransferRequest): Promise<BatchTransferResult> {
        try {
            // Validate request
            const validation = this.validateBatchRequest(request);
            if (!validation.isValid) {
                return {
                    txId: '',
                    success: false,
                    error: validation.errors.join('; ')
                };
            }

            // Simulate network delay (longer for more recipients)
            const delay = Math.min(5000, 1000 + (request.recipients.length * 10));
            await new Promise(resolve => setTimeout(resolve, delay));

            // Generate mock transaction ID
            const txId = '0x' + Math.random().toString(16).substr(2, 40) + Math.random().toString(16).substr(2, 24);

            // Simulate very small chance of failure
            if (Math.random() < 0.05) { // 5% chance of failure
                return {
                    txId: '',
                    success: false,
                    error: 'Transaction failed: Network congestion'
                };
            }

            return {
                txId,
                success: true
            };

        } catch (error) {
            return {
                txId: '',
                success: false,
                error: `Batch transfer failed: ${error}`
            };
        }
    }

    /**
     * Simulate individual transfer (for testing)
     */
    async simulateTransfer(sender: string, recipient: string, amount: number): Promise<BatchTransferResult> {
        return this.executeBatchTransfer({
            recipients: [{ address: recipient, amount }],
            sender
        });
    }
}

// Export singleton instances for both networks
export const tbbBatchTransferContract = new TBBBatchTransferContract('mainnet');
export const tbbBatchTransferContractTestnet = new TBBBatchTransferContract('testnet');

// Export the class for custom instances
export default TBBBatchTransferContract;