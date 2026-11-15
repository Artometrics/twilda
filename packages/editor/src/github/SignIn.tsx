import { useState } from "react";
import { pollDeviceFlow, startDeviceFlow } from "../../../backend-github/src/index";
import { githubClientId, githubOwner, githubRepo } from "./config";

/**
 * Device-flow sign-in for the phone desk.
 * The client id comes from PUBLIC_TWILDA_GITHUB_CLIENT_ID. The access token
 * stays in component state for this tab. Nothing is written to the repo.
 */
export function GithubSignIn({
  owner,
  repo,
  onOwner,
  onRepo,
  token,
  onToken,
}: {
  owner: string;
  repo: string;
  onOwner: (value: string) => void;
  onRepo: (value: string) => void;
  token: string;
  onToken: (value: string) => void;
}) {
  const [userCode, setUserCode] = useState("");
  const [verificationUri, setVerificationUri] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [message, setMessage] = useState("");

  async function start() {
    setMessage("");
    try {
      const flow = await startDeviceFlow({ clientId: githubClientId() });
      setUserCode(flow.userCode);
      setVerificationUri(flow.verificationUri);
      setDeviceCode(flow.deviceCode);
      setMessage("Enter that code on GitHub, then check again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GitHub sign-in did not start.");
    }
  }

  async function check() {
    if (!deviceCode) return;
    try {
      const result = await pollDeviceFlow({ clientId: githubClientId(), deviceCode });
      if (result.status === "ready" && result.accessToken) {
        onToken(result.accessToken);
        setMessage("Signed in for this tab. The token is not saved.");
        return;
      }
      setMessage("GitHub is still waiting for the code.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GitHub did not return a token.");
    }
  }

  return (
    <div className="stack" data-testid="github-signin">
      <p>
        GitHub publish is configured. Publishing still writes the file on this device, then opens a pull request when a
        token is present.
      </p>
      <label className="field">
        <span>Owner</span>
        <input value={owner} onChange={(event) => onOwner(event.target.value)} />
      </label>
      <label className="field">
        <span>Repository</span>
        <input value={repo} onChange={(event) => onRepo(event.target.value)} />
      </label>
      <p>{token ? "Signed in for this tab." : "Not signed in."}</p>
      <button type="button" className="btn" onClick={() => void start()}>
        Start GitHub sign-in
      </button>
      {userCode ? (
        <p>
          Code <strong>{userCode}</strong>
          {verificationUri ? (
            <>
              {" "}
              at <a href={verificationUri}>{verificationUri}</a>
            </>
          ) : null}
        </p>
      ) : null}
      <button type="button" className="btn" disabled={!deviceCode} onClick={() => void check()}>
        Check GitHub
      </button>
      {message ? <p className="hint">{message}</p> : null}
    </div>
  );
}

export function defaultGithubOwner(): string {
  return githubOwner();
}

export function defaultGithubRepo(): string {
  return githubRepo();
}
