export type KioskLoginResp = {
  kiosk_token: string;
  kioskId: number;
  schoolId: number;
  expiresAt: string;
};

export type KioskConfig = {
  apiBaseUrl: string;
  configPath?: string;
  kioskApiKey?: string;
};

export interface KioskBridge {
  getConfig: () => Promise<KioskConfig>;
  login: () => Promise<KioskLoginResp>;
}

declare global {
  interface Window {
    kiosk?: KioskBridge;
  }
}

export {};
