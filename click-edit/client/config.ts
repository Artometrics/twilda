function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export interface ClickEditConfig {
  /** Public OAuth client id (repo variable PUBLIC_TWILDA_GITHUB_CLIENT_ID). Not a secret. */
  clientId: string;
  owner: string;
  repo: string;
  /**
   * Optional pass-through proxy for github.com's device-flow endpoints.
   * Those endpoints send no CORS headers, so browsers cannot call them directly.
   */
  deviceFlowProxy: string;
}

export function readConfig(env: Record<string, unknown> = import.meta.env): ClickEditConfig {
  return {
    clientId: clean(env.PUBLIC_TWILDA_GITHUB_CLIENT_ID),
    owner: clean(env.PUBLIC_TWILDA_GITHUB_OWNER) || "Artometrics",
    repo: clean(env.PUBLIC_TWILDA_GITHUB_REPO) || "twilda",
    deviceFlowProxy: clean(env.PUBLIC_TWILDA_DEVICE_FLOW_PROXY),
  };
}
