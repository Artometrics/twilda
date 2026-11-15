/**
 * GitHub publish is off until Kyle sets a public OAuth client id.
 * Nothing in this file is a credential. An empty value keeps the desk on
 * browser storage.
 */
export function githubClientId(): string {
  const value = import.meta.env.PUBLIC_TWILDA_GITHUB_CLIENT_ID;
  return typeof value === "string" ? value.trim() : "";
}

export function githubOwner(): string {
  const value = import.meta.env.PUBLIC_TWILDA_GITHUB_OWNER;
  return typeof value === "string" && value.trim() ? value.trim() : "Artometrics";
}

export function githubRepo(): string {
  const value = import.meta.env.PUBLIC_TWILDA_GITHUB_REPO;
  return typeof value === "string" && value.trim() ? value.trim() : "twilda";
}

export function githubPublishConfigured(): boolean {
  return githubClientId().length > 0;
}
