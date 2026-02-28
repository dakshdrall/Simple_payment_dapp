import {
  rpc,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import { getNetworkConfig, DEFAULT_NETWORK } from './stellar';
import { StellarNetwork } from '@/types';

// ============================================================
// Soroban RPC Client
// ============================================================

let sorobanClient: rpc.Server | null = null;

export function getSorobanClient(network: StellarNetwork = DEFAULT_NETWORK): rpc.Server {
  if (!sorobanClient) {
    const config = getNetworkConfig(network);
    sorobanClient = new rpc.Server(config.sorobanRpcUrl, { allowHttp: false });
  }
  return sorobanClient;
}

// ============================================================
// Contract IDs
// ============================================================

export const CONTRACT_IDS = {
  token: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN',
  swap: process.env.NEXT_PUBLIC_SWAP_CONTRACT_ID || 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
};

// ============================================================
// Generic Contract Invocation
// ============================================================

export interface InvokeContractParams {
  contractId: string;
  functionName: string;
  args: xdr.ScVal[];
  publicKey: string;
  signTransaction: (xdr: string) => Promise<string>;
  network?: StellarNetwork;
}

/**
 * Simulate a contract call (read-only)
 */
export async function simulateContractCall(
  contractId: string,
  functionName: string,
  args: xdr.ScVal[],
  publicKey: string,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<unknown> {
  const client = getSorobanClient(network);
  const config = getNetworkConfig(network);

  const account = await client.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(buildInvokeOperation(contractId, functionName, args))
    .setTimeout(30)
    .build();

  const simResult = await client.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  if (!rpc.Api.isSimulationSuccess(simResult)) {
    throw new Error('Contract simulation returned no result');
  }

  const resultXdr = simResult.result?.retval;
  if (!resultXdr) return null;

  return scValToNative(resultXdr);
}

/**
 * Invoke a contract function (write - requires signing)
 */
export async function invokeContract({
  contractId,
  functionName,
  args,
  publicKey,
  signTransaction,
  network = DEFAULT_NETWORK,
}: InvokeContractParams): Promise<string> {
  const client = getSorobanClient(network);
  const config = getNetworkConfig(network);

  const account = await client.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(buildInvokeOperation(contractId, functionName, args))
    .setTimeout(180)
    .build();

  // Simulate to get resource estimates
  const simResult = await client.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  // Assemble with simulation data
  const assembled = rpc.assembleTransaction(tx, simResult).build();
  const xdrStr = assembled.toXDR();

  // Sign the transaction
  const signedXDR = await signTransaction(xdrStr);

  // Submit
  const submitResult = await client.sendTransaction(
    TransactionBuilder.fromXDR(signedXDR, config.networkPassphrase)
  );

  if (submitResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${submitResult.errorResult?.toXDR('base64')}`);
  }

  const hash = submitResult.hash;

  // Poll for completion
  let getResult = await client.getTransaction(hash);
  let attempts = 0;

  while (
    getResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 30
  ) {
    await sleep(2000);
    getResult = await client.getTransaction(hash);
    attempts++;
  }

  if (getResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return hash;
  } else if (getResult.status === rpc.Api.GetTransactionStatus.FAILED) {
    throw new Error('Transaction failed on-chain');
  } else {
    throw new Error('Transaction polling timed out');
  }
}

// ============================================================
// Token Contract Methods
// ============================================================

/**
 * Get token balance for an address
 */
export async function getTokenBalance(
  contractId: string,
  address: string,
  publicKey: string,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<bigint> {
  try {
    const result = await simulateContractCall(
      contractId,
      'balance',
      [new Address(address).toScVal()],
      publicKey,
      network
    );
    return BigInt(String(result || '0'));
  } catch {
    return BigInt(0);
  }
}

/**
 * Get token metadata (name, symbol, decimals)
 */
export async function getTokenMetadata(
  contractId: string,
  publicKey: string,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<{ name: string; symbol: string; decimals: number }> {
  try {
    const [name, symbol, decimals] = await Promise.all([
      simulateContractCall(contractId, 'name', [], publicKey, network),
      simulateContractCall(contractId, 'symbol', [], publicKey, network),
      simulateContractCall(contractId, 'decimals', [], publicKey, network),
    ]);

    return {
      name: String(name || 'Stellar Swap Token'),
      symbol: String(symbol || 'SST'),
      decimals: Number(decimals || 7),
    };
  } catch {
    return { name: 'Stellar Swap Token', symbol: 'SST', decimals: 7 };
  }
}

/**
 * Get total token supply
 */
export async function getTokenTotalSupply(
  contractId: string,
  publicKey: string,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<bigint> {
  try {
    const result = await simulateContractCall(
      contractId,
      'total_supply',
      [],
      publicKey,
      network
    );
    return BigInt(String(result || '0'));
  } catch {
    return BigInt(0);
  }
}

// ============================================================
// Swap Contract Methods
// ============================================================

/**
 * Get pool reserves from swap contract
 */
export async function getPoolReserves(
  swapContractId: string,
  publicKey: string,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<{ reserveA: bigint; reserveB: bigint }> {
  try {
    const result = await simulateContractCall(
      swapContractId,
      'get_reserves',
      [],
      publicKey,
      network
    ) as [bigint, bigint] | null;

    if (!result || !Array.isArray(result)) {
      return { reserveA: BigInt(0), reserveB: BigInt(0) };
    }

    return {
      reserveA: BigInt(String(result[0] || '0')),
      reserveB: BigInt(String(result[1] || '0')),
    };
  } catch {
    return { reserveA: BigInt(0), reserveB: BigInt(0) };
  }
}

/**
 * Get swap price quote
 */
export async function getSwapQuote(
  swapContractId: string,
  direction: 'a_to_b' | 'b_to_a',
  amountIn: bigint,
  publicKey: string,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<bigint> {
  try {
    const fn = direction === 'a_to_b' ? 'get_price_a_to_b' : 'get_price_b_to_a';
    const result = await simulateContractCall(
      swapContractId,
      fn,
      [nativeToScVal(amountIn, { type: 'i128' })],
      publicKey,
      network
    );
    return BigInt(String(result || '0'));
  } catch {
    return BigInt(0);
  }
}

/**
 * Get user liquidity shares
 */
export async function getUserShares(
  swapContractId: string,
  userAddress: string,
  publicKey: string,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<bigint> {
  try {
    const result = await simulateContractCall(
      swapContractId,
      'get_shares',
      [new Address(userAddress).toScVal()],
      publicKey,
      network
    );
    return BigInt(String(result || '0'));
  } catch {
    return BigInt(0);
  }
}

// ============================================================
// Event Streaming
// ============================================================

export interface EventFilter {
  contractId: string;
  topics?: string[][];
  startLedger?: number;
}

/**
 * Fetch contract events from Soroban RPC
 */
export async function fetchContractEvents(
  filter: EventFilter,
  network: StellarNetwork = DEFAULT_NETWORK
): Promise<rpc.Api.EventResponse[]> {
  const client = getSorobanClient(network);

  try {
    // Get current ledger to use as start
    const latestLedger = await client.getLatestLedger();
    const startLedger = filter.startLedger ?? Math.max(1, latestLedger.sequence - 100);

    const events = await client.getEvents({
      startLedger: startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [filter.contractId],
        },
      ],
      limit: 50,
    });

    return events.events;
  } catch {
    return [];
  }
}

// ============================================================
// Helper Functions
// ============================================================

function buildInvokeOperation(
  contractId: string,
  functionName: string,
  args: xdr.ScVal[]
): xdr.Operation {
  const contract = new xdr.InvokeContractArgs({
    contractAddress: new Address(contractId).toScAddress(),
    functionName: functionName,
    args: args,
  });

  return Operation.invokeHostFunction({
    func: xdr.HostFunction.hostFunctionTypeInvokeContract(contract),
    auth: [],
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format a contract ID for display
 */
export function formatContractId(id: string): string {
  if (!id || id.length < 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-6)}`;
}
