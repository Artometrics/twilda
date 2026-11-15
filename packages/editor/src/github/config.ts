/**
 * GitHub publish settings. Nothing here is a credential.
 *
 * - The default sign-in is a pasted fine-grained token, held in tab memory.
 *   It needs no configuration and no server.
 * - Device flow is optional. github.com's device endpoints send no CORS headers,
 *   so a browser can only use them through a stateless pass-through proxy
 *   (PUBLIC_TWILDA_DEVICE_FLOW_PROXY) and an OAuth client id
 *   (PUBLIC_TWILDA_GITHUB_CLIENT_ID). With either one missing, the desk offers
 *   the token field only.
 */
type Env = Record<string, unknown>;

/** Vite inlines `import.meta.env` in the browser. Under Node tests it is absent, and the settings are empty. */
function env(): Env {
  return (import.meta as { env?: Env }).env ?? {};
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function githubClientId(): string {
  return clean(env().PUBLIC_TWILDA_GITHUB_CLIENT_ID);
}

export function githubDeviceFlowProxy(): string {
  return clean(env().PUBLIC_TWILDA_DEVICE_FLOW_PROXY);
}

export function githubOwner(): string {
  return clean(env().PUBLIC_TWILDA_GITHUB_OWNER) || "Artometrics";
}

export function githubRepo(): string {
  return clean(env().PUBLIC_TWILDA_GITHUB_REPO) || "twilda";
}

export function deviceFlowAvailable(): boolean {
  return githubClientId().length > 0 && githubDeviceFlowProxy().length > 0;
}
