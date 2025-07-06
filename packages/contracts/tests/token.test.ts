import { Cl } from '@stacks/transactions';
import { describe, it, expect } from 'vitest';

describe('Token Contract Tests', () => {
  it('should get token name', () => {
    const result = simnet.callReadOnlyFn('token', 'get-name', [], simnet.deployer);
    expect(result.result).toBeOk(Cl.stringAscii('Token'));
  });

  it('should get token symbol', () => {
    const result = simnet.callReadOnlyFn('token', 'get-symbol', [], simnet.deployer);
    expect(result.result).toBeOk(Cl.stringAscii('TKN'));
  });

  it('should get token decimals', () => {
    const result = simnet.callReadOnlyFn('token', 'get-decimals', [], simnet.deployer);
    expect(result.result).toBeOk(Cl.uint(0));
  });
});