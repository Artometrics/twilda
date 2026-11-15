/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TWILDA_GITHUB_CLIENT_ID?: string;
  readonly PUBLIC_TWILDA_DEVICE_FLOW_PROXY?: string;
  readonly PUBLIC_TWILDA_GITHUB_OWNER?: string;
  readonly PUBLIC_TWILDA_GITHUB_REPO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TwildaDevHook {
  plantBuildFault(id: string, message: string): Promise<void>;
  failNextSave(message: string): void;
  failNextPublish(message: string): void;
}

interface Window {
  __TWILDA__?: TwildaDevHook;
}

declare module "virtual:twilda-plates" {
  /** `/media/<name>.svg` for each plate in the repo's `public/media`. */
  const plates: string[];
  export default plates;
}
