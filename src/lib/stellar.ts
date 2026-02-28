import {
  Networks,
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  Keypair,
  BASE_FEE,
  xdr,
} from '@stellar/stellar-sdk';
import { StellarNetwork, NetworkConfig, TransactionResult } from '@/types';

// ============================================================
// Network Configuration
// ============================================================

export const NETWORK_CONFIGS: Record<StellarNetwork, NetworkConfig> = {
  TESTNET: {
    network: 'TESTNET',
    networkPassphrase: Networks.TESTNET,
    horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  },
  PUBLIC: {
    network: 'PUBLIC',
    networkPassphrase: Networks.PUBLIC,
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpcUrl: 'https://soroban-mainnet.stellar.org',
  },
  FUTURENET: {
    network: 'FUTURENET',
    networkPassphrase: Networks.FUTURENET,
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    sorobanRpcUrl: 'https://rpc-futurenet.stellar.org',
  },
};

export const DEFAULT_NETWORK: StellarNetwork =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as StellarNetwork) || 'TESTNET';

export function getNetworkConfig(network: StellarNetwork = DEFAULT_NETWORK): NetworkConfig {
  return NETWORK_CONFIGS[network];
}

// ============================================================
// Horizon Client
// ============================================================

let horizonServer: Horizon.Server | null = null;

export function getHorizonServer(network: StellarNetwork = DEFAULT_NETWORK): Horizon.Server {
  if (!horizonServer) {
    const config = getNetworkConfig(network);
    horizonServer = new Horizon.Server(config.horizonUrl, { allowHttp: false });
  }
  return horizonServer;
}

// ============================================================
// Balance Fetching
// ============================================================

/**
 * Fetch XLM balance for a Stellar address
 */
export async function fetchXLMBalance(publicKey: string, network: StellarNetwork = DEFAULT_NETWORK): Promise<string> {
  const server = getHorizonServer(network);
  const account = await server.loadAccount(publicKey);

  const xlmBalance = account.balances.find(
    (b) => b.asset_type === 'native'
  );

  return xlmBalance ? xlmBalance.balance : '0';
}

/**
 * Fetch all balances for an account
 */
export async function fetchAllBalances(
  publicKey: string,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<Horizon.HorizonApi.BalanceLine[]> {
  const server = getHorizonServer(network);
  const account = await server.loadAccount(publicKey);
  return account.balances;
}

// ============================================================
// Transaction Building
// ============================================================

/**
 * Build a payment transaction for XLM
 */
export async function buildXLMPaymentTransaction(
  fromPublicKey: string,
  toPublicKey: string,
  amount: string,
  memo?: string,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<string> {
  const server = getHorizonServer(network);
  const config = getNetworkConfig(network);
  const account = await server.loadAccount(fromPublicKey);

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  });

  builder.addOperation(
    Operation.payment({
      destination: toPublicKey,
      asset: Asset.native(),
      amount: amount,
    })
  );

  if (memo) {
    const { Memo } = await import('@stellar/stellar-sdk');
    builder.addMemo(Memo.text(memo));
  }

  builder.setTimeout(180);
  const transaction = builder.build();
  return transaction.toXDR();
}

// ============================================================
// Transaction Submission
// ============================================================

/**
 * Submit a signed XDR transaction to the network
 */
export async function submitTransaction(
  signedXDR: string,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<TransactionResult> {
  const server = getHorizonServer(network);

  try {
    const tx = xdr.TransactionEnvelope.fromXDR(signedXDR, 'base64');
    const { Transaction } = await import('@stellar/stellar-sdk');
    const stellarTx = new Transaction(tx, getNetworkConfig(network).networkPassphrase);

    const result = await server.submitTransaction(stellarTx);

    return {
      hash: result.hash,
      status: 'SUCCESS',
      ledger: result.ledger,
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as { response: { data: { extras?: { result_codes?: { transaction?: string } } } } };
      const resultCodes = err.response?.data?.extras?.result_codes;
      throw new Error(
        resultCodes?.transaction || 'Transaction submission failed'
      );
    }
    throw error;
  }
}

// ============================================================
// Transaction Status Polling
// ============================================================

/**
 * Poll for transaction status by hash
 */
export async function pollTransactionStatus(
  hash: string,
  network: StellarNetwork = DEFAULT_NETWORK,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<TransactionResult> {
  const server = getHorizonServer(network);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const tx = await server.transactions().transaction(hash).call();

      if (tx.successful) {
        return {
          hash: tx.hash,
          status: 'SUCCESS',
          ledger: tx.ledger_attr,
        };
      } else {
        return {
          hash: tx.hash,
          status: 'FAILED',
          error: 'Transaction failed on-chain',
        };
      }
    } catch {
      // Transaction not yet found, keep polling
      if (attempt < maxAttempts - 1) {
        await sleep(intervalMs);
      }
    }
  }

  throw new Error('Transaction polling timed out');
}

// ============================================================
// Address Validation
// ============================================================

/**
 * Validate a Stellar public key
 */
export function isValidPublicKey(key: string): boolean {
  try {
    Keypair.fromPublicKey(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a Stellar contract address (C... address)
 */
export function isValidContractAddress(address: string): boolean {
  return address.startsWith('C') && address.length === 56;
}

// ============================================================
// Formatting Utilities
// ============================================================

/**
 * Format stroops to XLM string
 */
export function stroopsToXLM(stroops: string | number | bigint): string {
  const num = typeof stroops === 'bigint' ? Number(stroops) : Number(stroops);
  return (num / 10_000_000).toFixed(7);
}

/**
 * Format XLM to display string (max 4 decimal places)
 */
export function formatXLM(balance: string): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return '0.0000';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(raw: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole.toLocaleString('en-US')}.${fractionStr}`;
}

/**
 * Shorten a Stellar address for display
 */
export function shortenAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
