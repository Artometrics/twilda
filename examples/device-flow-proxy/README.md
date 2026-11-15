# Device-flow proxy (reference)

GitHub's device-flow endpoints (`github.com/login/device/code` and `github.com/login/oauth/access_token`) send no CORS headers, so a browser cannot call them. This is a reference for the smallest thing that fixes that. It is optional: the desk works without it when a person pastes a fine-grained token.

Nothing in the Twilda build imports this folder. It is not deployed from this repository and there is no deploy script for it.

## What it does

- Accepts `POST /login/device/code` and `POST /login/oauth/access_token`, JSON body under 2 KB.
- Forwards each to github.com with the one `client_id` it was configured for and, for the first route, one fixed `scope`.
- Replies with a whitelist of GitHub's response fields and the CORS headers for exactly one origin.

Everything else is a 404 or 405. A request from any other origin is a 403 before the body is read.

## What it does not do

| It never | Why |
| --- | --- |
| Stores anything: no KV, no Durable Object, no database, no cache | The access token passes through in a response body. If nothing is stored there is nothing to leak later. |
| Logs a request, a body, or a response | A log line with a `device_code` or `access_token` is a token store by another name. There is no `console` call in `worker.ts`, and `tests/security/proxy.test.ts` checks that. |
| Accepts a `client_id` other than its own | It is not an open relay for other OAuth apps. |
| Lets the caller choose the scope | The deployer fixes it. |
| Answers `Access-Control-Allow-Origin: *` | `createProxy` refuses a wildcard or malformed origin at start-up. |
| Needs a client secret | The device flow does not use one. Do not give this proxy one. |

## Deploying it (the owner's step)

1. Create a GitHub OAuth App (or GitHub App with device flow enabled). Tick "Enable Device Flow". Copy the client id. The client id is public. Do not copy the client secret anywhere.
2. Host `worker.ts` on any platform that has `Request`, `Response`, and `fetch`: Cloudflare Workers, Deno Deploy, Bun, Node 22. Set `clientId` and `allowedOrigin` (the desk's exact origin, such as `https://twilda-desk.web.app`). On Workers, bind them as plain variables. They are not secrets.
3. Build the desk with `PUBLIC_TWILDA_GITHUB_CLIENT_ID` and `PUBLIC_TWILDA_DEVICE_FLOW_PROXY` set. The button appears only when both are set.
4. **Add the proxy's origin to the desk's `connect-src` in `firebase.json`.** The desk's policy is `connect-src 'self' https://api.github.com`, so the browser will block the proxy until that line names it. That is a deliberate default, and it is the one change to a header this setup needs. `tests/csp.test.ts` pins the current value, so the pull request that adds the origin must update that test with it. That makes the change visible in review.
5. Do not put the proxy behind a CDN cache. Responses carry `Cache-Control: no-store`.

## Choosing a scope

`repo` is the only classic OAuth scope that lets a person open a pull request on a private repository. It is broad: it grants read and write to every repository the person can reach. If the owner can, prefer the GitHub App route, where the installation is limited to named repositories and the permissions are Contents and Pull requests only. That migration is listed as an owner item in the Phase 3 pull request and is not done here.

For a public repository, `public_repo` is narrower and enough. Set it as `scope` in the proxy's configuration.

## Checking a deployment

- `curl -i -X POST https://<proxy>/login/device/code -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d '{}'` should answer 403 with no `Access-Control-Allow-Origin: *`.
- The same call with the right origin should answer with a `device_code` and a `user_code`, `Cache-Control: no-store`, and no `Set-Cookie`.
- Look at the platform's dashboard: no request bodies should appear. If the platform logs them by default (some do, with tail or trace features), turn that off or choose another host.
