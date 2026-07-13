export {};

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
    process: {
      env: {
        GEMINI_API_KEY?: string;
        YOUTUBE_API_KEY?: string;
        API_KEY?: string;
      };
    };
  }

  interface ImportMetaEnv {
    readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
