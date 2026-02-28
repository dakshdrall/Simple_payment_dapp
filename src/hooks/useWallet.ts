'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { WalletState, WalletType, StellarNetwork } from '@/types';
import { parseError } from '@/lib/errors';
import { DEFAULT_NETWORK } from '@/lib/stellar';

// ============================================================
// Multi-wallet hook with direct API connections
// ============================================================

interface UseWalletReturn extends WalletState {
  connect: (walletType?: WalletType) => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string>;
  openWalletModal: () => Promise<void>;
}

const WALLET_STORAGE_KEY = 'stellar_wallet_type';

let kitInitialized = false;

async function initKit() {
  if (kitInitialized) return;
  try {
    const { StellarWalletsKit, Networks } = await import('@creit.tech/stellar-wallets-kit');
    const { FreighterModule, FREIGHTER_ID } = await import(
      '@creit.tech/stellar-wallets-kit/modules/freighter'
    );
    const { xBullModule } = await import(
      '@creit.tech/stellar-wallets-kit/modules/xbull'
    );

    StellarWalletsKit.init({
      network: Networks.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: [new FreighterModule() as never, new xBullModule() as never],
    });
    kitInitialized = true;
  } catch {
    // Kit unavailable — direct APIs will be used
  }
}

// Connect to Freighter directly using @stellar/freighter-api
async function connectFreighter(): Promise<{ publicKey: string; network: StellarNetwork }> {
  const freighterApi = await import('@stellar/freighter-api');

  // requestAccess() prompts the user to grant access and returns the public key.
  // In v2 it may return a string or { publicKey: string }.
  const result = await freighterApi.requestAccess();
  const publicKey =
    typeof result === 'string'
      ? result
      : (result as { publicKey?: string })?.publicKey ?? '';

  if (!publicKey) {
    throw new Error('Freighter access denied or wallet not installed. Install Freighter at https://www.freighter.app/');
  }

  let network: StellarNetwork = 'TESTNET';
  try {
    const details = await freighterApi.getNetworkDetails();
    const net = (details as { network?: string })?.network?.toUpperCase();
    if (net === 'PUBLIC' || net === 'FUTURENET' || net === 'TESTNET') {
      network = net as StellarNetwork;
    }
  } catch {
    // Default to TESTNET
  }

  return { publicKey, network };
}

// Connect via StellarWalletsKit (for xBull, Albedo, etc.)
async function connectViaKit(walletId: string): Promise<string> {
  await initKit();
  const { StellarWalletsKit } = await import('@creit.tech/stellar-wallets-kit');
  StellarWalletsKit.setWallet(walletId);
  const { address } = await StellarWalletsKit.getAddress();
  if (!address) throw new Error('No address returned from wallet');
  return address;
}

export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    publicKey: null,
    walletType: null,
    network: DEFAULT_NETWORK,
    isLoading: false,
    error: null,
  });

  const activeWalletRef = useRef<WalletType | null>(null);

  // Restore wallet session on mount
  useEffect(() => {
    const saved = localStorage.getItem(WALLET_STORAGE_KEY) as WalletType | null;
    if (saved) {
      connect(saved).catch(() => {
        localStorage.removeItem(WALLET_STORAGE_KEY);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async (walletType?: WalletType) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const type = walletType || 'freighter';

    try {
      if (type === 'freighter') {
        // Use the direct Freighter API for reliable access-requesting
        const { publicKey, network } = await connectFreighter();
        activeWalletRef.current = 'freighter';
        setState({
          isConnected: true,
          publicKey,
          walletType: 'freighter',
          network,
          isLoading: false,
          error: null,
        });
        localStorage.setItem(WALLET_STORAGE_KEY, 'freighter');
        return;
      }

      // xBull, Albedo, and others via StellarWalletsKit
      const address = await connectViaKit(type);
      activeWalletRef.current = type;
      setState({
        isConnected: true,
        publicKey: address,
        walletType: type,
        network: DEFAULT_NETWORK,
        isLoading: false,
        error: null,
      });
      localStorage.setItem(WALLET_STORAGE_KEY, type);
    } catch (err) {
      const parsedError = parseError(err);
      setState((prev) => ({ ...prev, isLoading: false, error: parsedError }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      publicKey: null,
      walletType: null,
      network: DEFAULT_NETWORK,
      isLoading: false,
      error: null,
    });
    activeWalletRef.current = null;
    localStorage.removeItem(WALLET_STORAGE_KEY);
  }, []);

  const signTransaction = useCallback(
    async (xdrString: string): Promise<string> => {
      if (!state.publicKey) throw new Error('Wallet not connected');

      const type = activeWalletRef.current || state.walletType;

      if (type === 'freighter') {
        const { signTransaction: freighterSign } = await import('@stellar/freighter-api');
        const result = await freighterSign(xdrString, {
          networkPassphrase: 'Test SDF Network ; September 2015',
          accountToSign: state.publicKey,
        });
        // Handle both string and { signedTxXdr } response shapes
        return typeof result === 'string'
          ? result
          : (result as { signedTxXdr?: string })?.signedTxXdr ?? result as unknown as string;
      }

      // Other wallets via kit
      try {
        if (kitInitialized) {
          const { StellarWalletsKit } = await import('@creit.tech/stellar-wallets-kit');
          const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdrString, {
            networkPassphrase: 'Test SDF Network ; September 2015',
            address: state.publicKey,
          });
          return signedTxXdr;
        }
      } catch {
        // Fall through
      }

      throw new Error('Unable to sign transaction — no wallet connected');
    },
    [state.publicKey, state.walletType]
  );

  const openWalletModal = useCallback(async () => {
    // Directly trigger the connect flow; the UI picker is handled by the page
    await connect('freighter');
  }, [connect]);

  return {
    ...state,
    connect,
    disconnect,
    signTransaction,
    openWalletModal,
  };
}
