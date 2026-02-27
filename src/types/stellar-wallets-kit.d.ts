// Type declarations for @creit.tech/stellar-wallets-kit subpath exports
// These subpaths exist in the package but lack "types" in their exports map

declare module '@creit.tech/stellar-wallets-kit/modules/freighter' {
  export const FREIGHTER_ID: string;
  export class FreighterModule {
    moduleType: string;
    productId: string;
    productName: string;
    productUrl: string;
    productIcon: string;
    runChecks(): Promise<void>;
    isAvailable(): Promise<boolean>;
    getAddress(params?: { skipRequestAccess?: boolean }): Promise<{ address: string }>;
    signTransaction(
      xdr: string,
      opts?: { networkPassphrase?: string; address?: string }
    ): Promise<{ signedTxXdr: string; signerAddress?: string }>;
    getNetwork(): Promise<{ network: string; networkPassphrase: string }>;
  }
}

declare module '@creit.tech/stellar-wallets-kit/modules/xbull' {
  export const XBULL_ID: string;
  export class xBullModule {
    moduleType: string;
    productId: string;
    productName: string;
    productUrl: string;
    productIcon: string;
    isAvailable(): Promise<boolean>;
    getAddress(): Promise<{ address: string }>;
    signTransaction(
      xdr: string,
      opts?: { networkPassphrase?: string; address?: string }
    ): Promise<{ signedTxXdr: string; signerAddress?: string }>;
    getNetwork(): Promise<{ network: string; networkPassphrase: string }>;
  }
}
