'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { WalletState, WalletType, StellarNetwork } from '@/types';
import { parseError } from '@/lib/errors';
import { DEFAULT_NETWORK } from '@/lib/stellar';

// ============================================================
// StellarWalletsKit integration with multi-wallet support
// ============================================================

interface UseWalletReturn extends WalletState {
  connect: (walletType?: WalletType) => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string>;
  openWalletModal: () => Promise<void>;
}

const WALLET_STORAGE_KEY = 'stellar_wallet_type';

// Kit is a static class — track whether it has been initialized
let kitInitialized = false;

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

  // Ensure kit is initialized (static class, only do once)
  const initKit = useCallback(async () => {
    if (kitInitialized) return;
    try {
      const { StellarWalletsKit, Networks } = await import('@creit.tech/stellar-wallets-kit');
      // Modules are subpath exports in v2 — type declarations in src/types/stellar-wallets-kit.d.ts
      const { FreighterModule, FREIGHTER_ID } = await import(
        '@creit.tech/stellar-wallets-kit/modules/freighter'
      );
      const { xBullModule } = await import(
        '@creit.tech/stellar-wallets-kit/modules/xbull'
      );

      StellarWalletsKit.init({
        network: Networks.TESTNET,
        selectedWalletId: FREIGHTER_ID,
        modules: [new FreighterModule() as any, new xBullModule() as any],
      });
      kitInitialized = true;
    } catch {
      // Kit init failed — will fall back to Freighter API directly
    }
  }, []);

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

  const connect = useCallback(
    async (walletType?: WalletType) => {
      setState((prev: WalletState) => ({ ...prev, isLoading: true, error: null }));

      // ---- Try @creit.tech/stellar-wallets-kit (static class) ----
      try {
        await initKit();

        const { StellarWalletsKit } = await import('@creit.tech/stellar-wallets-kit');

        // Map our WalletType to kit wallet IDs
        const walletIdMap: Record<WalletType, string> = {
          freighter: 'freighter',
          xbull: 'xbull',
          albedo: 'albedo',
          rabet: 'rabet',
          hana: 'hana',
        };

        if (walletType) {
          StellarWalletsKit.setWallet(walletIdMap[walletType]);
        }

        const { address } = await StellarWalletsKit.getAddress();

        if (!address) throw new Error('No address returned from wallet');

        const resolvedType = walletType || 'freighter';
        activeWalletRef.current = resolvedType;

        setState({
          isConnected: true,
          publicKey: address,
          walletType: resolvedType,
          network: DEFAULT_NETWORK,
          isLoading: false,
          error: null,
        });

        localStorage.setItem(WALLET_STORAGE_KEY, resolvedType);
        return;
      } catch {
        // Fall through to Freighter API direct
      }

      // ---- Fallback: Freighter API v2 directly ----
      try {
        const {
          isConnected: checkConnected,
          getPublicKey,
          getNetworkDetails,
          requestAccess,
        } = await import('@stellar/freighter-api');

        const connected = await checkConnected();
        if (!connected) {
          await requestAccess();
        }

        const publicKey = await getPublicKey();
        if (!publicKey) throw new Error('Wallet not found. Please install Freighter.');

        const details = await getNetworkDetails();

        activeWalletRef.current = 'freighter';
        setState({
          isConnected: true,
          publicKey,
          walletType: 'freighter',
          network: (details.network?.toUpperCase() as StellarNetwork) || 'TESTNET',
          isLoading: false,
          error: null,
        });

        localStorage.setItem(WALLET_STORAGE_KEY, 'freighter');
      } catch (freighterErr) {
        const parsedError = parseError(freighterErr);
        setState((prev: WalletState) => ({
          ...prev,
          isLoading: false,
          error: parsedError,
        }));
      }
    },
    [initKit]
  );

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

      // ---- Try wallets kit (static class) ----
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
        // Fall through to Freighter API
      }

      // ---- Fallback: Freighter API v2 ----
      const { signTransaction: freighterSign } = await import('@stellar/freighter-api');
      // Freighter v2 signTransaction returns Promise<string> directly
      const signed = await freighterSign(xdrString, {
        networkPassphrase: 'Test SDF Network ; September 2015',
        accountToSign: state.publicKey,
      });
      return signed;
    },
    [state.publicKey]
  );

  const openWalletModal = useCallback(async () => {
    try {
      await initKit();
      const { StellarWalletsKit } = await import('@creit.tech/stellar-wallets-kit');
      const { address } = await StellarWalletsKit.authModal();
      if (address) {
        const resolvedType = activeWalletRef.current || 'freighter';
        setState({
          isConnected: true,
          publicKey: address,
          walletType: resolvedType,
          network: DEFAULT_NETWORK,
          isLoading: false,
          error: null,
        });
        localStorage.setItem(WALLET_STORAGE_KEY, resolvedType);
      }
    } catch {
      await connect('freighter');
    }
  }, [initKit, connect]);

  return {
    ...state,
    connect,
    disconnect,
    signTransaction,
    openWalletModal,
  };
}
