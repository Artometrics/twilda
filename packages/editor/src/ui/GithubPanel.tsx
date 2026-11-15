import { useEffect, useState } from "react";
import { pollDeviceFlow, startDeviceFlow } from "../../../backend-github/src/index";
import { deviceFlowAvailable, githubClientId, githubDeviceFlowProxy } from "../github/config";
import { describeAuthError } from "../github/publish";

interface Flow {
  userCode: string;
  verificationUri: string;
  deviceCode: string;
  interval: number;
  expiresAt: number;
}

/**
 * Where a published draft goes. Pasting a fine-grained token is the default and
 * the only path that needs nothing deployed: the token stays in this tab's
 * memory, and with no token, publishing stays on this device. Device flow
 * appears only when a client id and a pass-through proxy are both configured.
 */
export function GithubPanel({
  owner,
  repo,
  onOwner,
  onRepo,
  token,
  onToken,
  fetchImpl,
}: {
  owner: string;
  repo: string;
  onOwner: (value: string) => void;
  onRepo: (value: string) => void;
  token: string;
  onToken: (value: string) => void;
  fetchImpl?: typeof fetch;
}) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [message, setMessage] = useState("");
  const proxy = githubDeviceFlowProxy();

  useEffect(() => {
    if (!flow || token) return;
    let stop = false;
    let timer = 0;
    const tick = async () => {
      if (stop || Date.now() > flow.expiresAt) return;
      try {
        const result = await pollDeviceFlow({
          clientId: githubClientId(),
          deviceCode: flow.deviceCode,
          baseUrl: proxy,
          fetchImpl,
        });
        if (stop) return;
        if (result.status === "ready" && result.accessToken) {
          onToken(result.accessToken);
          setFlow(null);
          setMessage("Signed in for this tab. The token is not saved.");
          return;
        }
      } catch (error) {
        if (!stop) {
          setFlow(null);
          setMessage(describeAuthError(error, proxy));
        }
        return;
      }
      timer = window.setTimeout(() => void tick(), Math.max(flow.interval, 1) * 1000);
    };
    timer = window.setTimeout(() => void tick(), Math.max(flow.interval, 1) * 1000);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [flow, token, proxy, fetchImpl, onToken]);

  async function start() {
    setMessage("");
    try {
      const started = await startDeviceFlow({ clientId: githubClientId(), baseUrl: proxy, fetchImpl });
      setFlow({
        userCode: started.userCode,
        verificationUri: started.verificationUri,
        deviceCode: started.deviceCode,
        interval: started.interval,
        expiresAt: Date.now() + started.expiresIn * 1000,
      });
    } catch (error) {
      setMessage(describeAuthError(error, proxy));
    }
  }

  return (
    <fieldset className="github" data-testid="github-panel">
      <legend>Also open a pull request on GitHub</legend>
      <p className="hint">
        Optional. Paste a fine-grained token with Contents and Pull requests write access to the repository. It stays in
        this tab and is never saved. Without one, publishing stays on this device.
      </p>
      <div className="field-row">
        <label className="field">
          <span>Owner</span>
          <input data-testid="github-owner" value={owner} autoCapitalize="off" onChange={(event) => onOwner(event.target.value)} />
        </label>
        <label className="field">
          <span>Repository</span>
          <input data-testid="github-repo" value={repo} autoCapitalize="off" onChange={(event) => onRepo(event.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>GitHub token</span>
        <input
          data-testid="github-token"
          type="password"
          value={token}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="github_pat_…"
          onChange={(event) => onToken(event.target.value.trim())}
        />
      </label>
      <p className="hint" data-testid="github-state">
        {token ? "Token set for this tab. Publishing will also open a pull request into main." : "No token. Publishing stays on this device."}
      </p>
      {deviceFlowAvailable() && !token ? (
        <div className="stack" data-testid="device-flow">
          {flow ? (
            <p>
              Enter <strong className="code">{flow.userCode}</strong> at{" "}
              <a href={flow.verificationUri} target="_blank" rel="noreferrer noopener">
                {flow.verificationUri}
              </a>
              . This checks on its own.
            </p>
          ) : (
            <button type="button" className="btn" data-testid="device-flow-start" onClick={() => void start()}>
              Sign in with GitHub instead
            </button>
          )}
        </div>
      ) : null}
      {message ? (
        <p className="hint" role="status" data-testid="github-message">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}
