/// <reference types="vite/client" />

interface TwildaDevHook {
  plantBuildFault(id: string, message: string): Promise<void>;
  failNextSave(message: string): void;
  failNextPublish(message: string): void;
}

interface Window {
  __TWILDA__?: TwildaDevHook;
}
