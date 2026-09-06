import { BlockchainType } from '@chaintrace/types';

export const CHAIN_METADATA: Record<BlockchainType, { name: string; symbol: string; explorerUrl: string }> = {
  tron: {
    name: 'TRON',
    symbol: 'TRX',
    explorerUrl: 'https://tronscan.org/#/transaction/',
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    explorerUrl: 'https://etherscan.io/tx/',
  },
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    explorerUrl: 'https://mempool.space/tx/',
  },
};

/**
 * Address format validation regex rules per chain
 */
export const ADDRESS_VALIDATION_REGEX: Record<BlockchainType, RegExp> = {
  tron: /^T[1-9A-HJ-NP-za-km-z]{33}$/,
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  bitcoin: /^(bc1[a-zA-HJ-NP-Z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
};

export function isValidAddress(chain: BlockchainType, address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const regex = ADDRESS_VALIDATION_REGEX[chain];
  return regex ? regex.test(address.trim()) : false;
}

export const DEFENSIVE_LIMITS = {
  DEFAULT_HOPS: 4,
  MAX_HOPS: 7,
  MAX_GRAPH_NODES: 1000,
  MAX_GRAPH_EDGES: 2500,
  DEFAULT_TIMEOUT_MS: 30000,
};
