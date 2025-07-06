import { describe, it, expect } from 'vitest';
import { Cl } from '@stacks/transactions';

const tokenErrors = {
  notEnoughBalance: Cl.uint(1),
  senderRecipient: Cl.uint(2),
  invalidAmount: Cl.uint(3),
  notTokenOwner: Cl.uint(4),
};

describe('Batch Transfer Contract Tests', () => {
  it('should handle empty batch transfer list', () => {
    const emptyList = Cl.list([]);
    const result = simnet.callPublicFn('token-batch-transfer', 'send-many', [emptyList], simnet.deployer);
    expect(result.result).toBeOk(Cl.bool(true));
  });

  it('should successfully transfer to multiple recipients', () => {
    const recipients = Cl.list([
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_1')!),
        amount: Cl.uint(1000000),
        memo: Cl.none()
      }),
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_2')!),
        amount: Cl.uint(2000000),
        memo: Cl.some(Cl.bufferFromUtf8("batch transfer"))
      })
    ]);

    const result = simnet.callPublicFn('token-batch-transfer', 'send-many', [recipients], simnet.deployer);
    expect(result.result).toBeOk(Cl.bool(true));

    // Verify recipients received tokens
    const wallet1Balance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.getAccounts().get('wallet_1')!)], simnet.deployer);
    expect(wallet1Balance.result).toBeOk(Cl.uint(1000000));

    const wallet2Balance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.getAccounts().get('wallet_2')!)], simnet.deployer);
    expect(wallet2Balance.result).toBeOk(Cl.uint(2000000));
  });

  // Fail Cases
  it('should fail when sender has insufficient balance', () => {
    // Transfer most tokens away first to create insufficient balance scenario
    const largeTransfer = Cl.list([
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_1')!),
        amount: Cl.uint(9999000000), // Almost all tokens (MAX_SUPPLY is 10B)
        memo: Cl.none()
      })
    ]);
    simnet.callPublicFn('token-batch-transfer', 'send-many', [largeTransfer], simnet.deployer);

    // Now try to send more than remaining balance
    const insufficientBalanceList = Cl.list([
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_2')!),
        amount: Cl.uint(2000000), // More than remaining balance
        memo: Cl.none()
      })
    ]);

    const result = simnet.callPublicFn('token-batch-transfer', 'send-many', [insufficientBalanceList], simnet.deployer);
    expect(result.result).toBeErr(tokenErrors.notEnoughBalance);
  });

  it('should fail when trying to send to self', () => {
    const selfTransferList = Cl.list([
      Cl.tuple({
        to: Cl.principal(simnet.deployer), // Same as tx-sender
        amount: Cl.uint(1000000),
        memo: Cl.none()
      })
    ]);

    const result = simnet.callPublicFn('token-batch-transfer', 'send-many', [selfTransferList], simnet.deployer);
    expect(result.result).toBeErr(tokenErrors.senderRecipient);
  });

  it('should fail when amount is zero', () => {
    const zeroAmountList = Cl.list([
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_1')!),
        amount: Cl.uint(0), // Invalid zero amount
        memo: Cl.none()
      })
    ]);

    const result = simnet.callPublicFn('token-batch-transfer', 'send-many', [zeroAmountList], simnet.deployer);
    expect(result.result).toBeErr(tokenErrors.invalidAmount);
  });

  it('should fail on first error in batch and stop processing', () => {
    // Create a batch where the first transfer will fail due to insufficient balance
    // Transfer most tokens away first
    const setupTransfer = Cl.list([
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_1')!),
        amount: Cl.uint(9999999000), // Leave only 1000 tokens
        memo: Cl.none()
      })
    ]);
    simnet.callPublicFn('token-batch-transfer', 'send-many', [setupTransfer], simnet.deployer);

    // Check deployer balance is now very low
    const deployerBalance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.deployer)], simnet.deployer);

    // Now create a batch where first transfer fails, second would succeed if reached
    const failingBatch = Cl.list([
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_2')!),
        amount: Cl.uint(2000), // This should fail - insufficient balance
        memo: Cl.none()
      }),
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_3')!),
        amount: Cl.uint(500), // This would succeed if reached
        memo: Cl.none()
      })
    ]);

    const result = simnet.callPublicFn('token-batch-transfer', 'send-many', [failingBatch], simnet.deployer);
    expect(result.result).toBeErr(tokenErrors.notEnoughBalance);

    // Verify that wallet_3 did not receive tokens (batch stopped at first error)
    const wallet3Balance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.getAccounts().get('wallet_3')!)], simnet.deployer);
    expect(wallet3Balance.result).toBeOk(Cl.uint(0));
  });

  it('should fail when trying to transfer from account that does not own the tokens', () => {
    // Try to call batch transfer from wallet_1 instead of deployer
    const transferList = Cl.list([
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_2')!),
        amount: Cl.uint(1000000),
        memo: Cl.none()
      })
    ]);

    // wallet_1 doesn't own the tokens, deployer does
    const result = simnet.callPublicFn('token-batch-transfer', 'send-many', [transferList], simnet.getAccounts().get('wallet_1')!);
    expect(result.result).toBeErr(tokenErrors.notEnoughBalance);
  });

  it('should handle mixed valid and invalid transfers (fail on first invalid)', () => {
    const mixedBatch = Cl.list([
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_1')!),
        amount: Cl.uint(1000000), // Valid transfer
        memo: Cl.none()
      }),
      Cl.tuple({
        to: Cl.principal(simnet.deployer), // Invalid - sending to self
        amount: Cl.uint(500000),
        memo: Cl.none()
      }),
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_2')!),
        amount: Cl.uint(750000), // Would be valid if reached
        memo: Cl.none()
      })
    ]);

    const result = simnet.callPublicFn('token-batch-transfer', 'send-many', [mixedBatch], simnet.deployer);
    expect(result.result).toBeErr(tokenErrors.senderRecipient);

    // Verify that wallet_2 did not receive tokens (batch stopped at second transfer)
    const wallet2Balance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.getAccounts().get('wallet_2')!)], simnet.deployer);
    expect(wallet2Balance.result).toBeOk(Cl.uint(0));
  });

  it('should handle maximum batch size (200 recipients)', () => {
    // Create a list with exactly 200 recipients
    const recipients = [];
    for (let i = 0; i < 200; i++) {
      recipients.push(
        Cl.tuple({
          to: Cl.principal(simnet.getAccounts().get('wallet_1')!), // All to same recipient for simplicity
          amount: Cl.uint(1000), // Small amounts to avoid balance issues
          memo: Cl.none()
        })
      );
    }
    const maxBatch = Cl.list(recipients);

    const result = simnet.callPublicFn('token-batch-transfer', 'send-many', [maxBatch], simnet.deployer);
    expect(result.result).toBeOk(Cl.bool(true));

    // Verify total transferred amount
    const wallet1Balance = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.getAccounts().get('wallet_1')!)], simnet.deployer);
    expect(wallet1Balance.result).toBeOk(Cl.uint(200000)); // 200 * 1000
  });

  it('should preserve transaction atomicity - all or nothing', () => {
    // Get initial balances
    const initialWallet1 = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.getAccounts().get('wallet_1')!)], simnet.deployer);
    const initialWallet2 = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.getAccounts().get('wallet_2')!)], simnet.deployer);
    const initialDeployer = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.deployer)], simnet.deployer);

    // Create a batch that will fail on the last transfer
    const atomicityTestBatch = Cl.list([
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_1')!),
        amount: Cl.uint(1000000), // Valid transfer
        memo: Cl.none()
      }),
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_2')!),
        amount: Cl.uint(2000000), // Valid transfer
        memo: Cl.none()
      }),
      Cl.tuple({
        to: Cl.principal(simnet.getAccounts().get('wallet_3')!),
        amount: Cl.uint(0), // Invalid amount - will fail
        memo: Cl.none()
      })
    ]);

    const result = simnet.callPublicFn('token-batch-transfer', 'send-many', [atomicityTestBatch], simnet.deployer);
    expect(result.result).toBeErr(tokenErrors.invalidAmount);

    // Verify that balances remain unchanged (atomicity preserved)
    const finalWallet1 = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.getAccounts().get('wallet_1')!)], simnet.deployer);
    const finalWallet2 = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.getAccounts().get('wallet_2')!)], simnet.deployer);
    const finalDeployer = simnet.callReadOnlyFn('token', 'get-balance', [Cl.principal(simnet.deployer)], simnet.deployer);

    expect(finalWallet1.result).toEqual(initialWallet1.result);
    expect(finalWallet2.result).toEqual(initialWallet2.result);
    expect(finalDeployer.result).toEqual(initialDeployer.result);
  });
});