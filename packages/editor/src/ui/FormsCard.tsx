import { MAX_FORM_HIDDEN, checkFormEndpoint, formsConfigSchema, siteCsp, type FormsConfig, type SiteSettings } from "@twilda/core";
import { useState } from "react";

function hiddenToText(hidden: FormsConfig["hidden"]): string {
  return Object.entries(hidden)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function textToHidden(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const at = line.indexOf("=");
    if (at > 0) out[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return out;
}

/**
 * Where a form on the site sends what a visitor typed. The address is one setting for the whole site
 * (`forms` in content/site.json). Twilda receives nothing: the browser posts straight to this address.
 * An address is only written to the site once it passes the same check the build applies, so a half-typed
 * one never reaches the file. The card also prints the Content-Security-Policy that address needs, because the
 * host, not Twilda, serves it.
 */
export function FormsCard({ site, busy, onChange }: { site: SiteSettings; busy: boolean; onChange: (site: SiteSettings) => void }) {
  const forms = site.forms;
  const [endpoint, setEndpoint] = useState(forms?.endpoint ?? "");
  const [hidden, setHidden] = useState(hiddenToText(forms?.hidden ?? {}));
  const check = endpoint.trim() === "" ? null : checkFormEndpoint(endpoint.trim());
  const mode = forms?.mode ?? "fetch";
  const format = forms?.format ?? "form";

  const commit = (patch: Partial<FormsConfig> & { endpoint?: string }) => {
    const next = formsConfigSchema.safeParse({ endpoint: endpoint.trim(), mode, format, hidden: textToHidden(hidden), ...patch });
    if (next.success) onChange({ ...site, forms: next.data });
  };
  const hiddenProblem = (() => {
    const parsed = formsConfigSchema.safeParse({ endpoint: check?.ok ? endpoint.trim() : "https://forms.example-studio.com/f", mode, format, hidden: textToHidden(hidden) });
    return parsed.success ? null : (parsed.error.issues.find((issue) => issue.path[0] === "hidden" || issue.path[0] === "format")?.message ?? null);
  })();
  const policy = (() => {
    try {
      return forms ? siteCsp(site) : null;
    } catch {
      return null;
    }
  })();

  return (
    <fieldset className="mode-picker" data-testid="forms-card">
      <legend>Forms</legend>
      <p className="hint">
        Twilda stores nothing a visitor types. Your form service does. Paste the address it gave you, and every form on this site sends there. It must start with https://.
      </p>
      <label className="field">
        <span>Form address</span>
        <input
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          maxLength={300}
          placeholder="https://formspree.io/f/your-form-id"
          data-testid="forms-endpoint"
          aria-invalid={check ? !check.ok : undefined}
          value={endpoint}
          onChange={(event) => {
            setEndpoint(event.target.value);
            const value = event.target.value.trim();
            if (value === "") onChange({ ...site, forms: undefined });
            else if (checkFormEndpoint(value).ok) commit({ endpoint: value });
          }}
        />
      </label>
      {check && !check.ok ? (
        <p className="field-error" role="alert" data-testid="forms-endpoint-error">
          {check.reason} Not saved yet.
        </p>
      ) : null}
      {check?.ok ? (
        <p className="hint ok" data-testid="forms-endpoint-ok">
          Forms will send to <strong>{check.origin}</strong> and nowhere else.
        </p>
      ) : null}
      <label className="field">
        <span>How it sends</span>
        <select
          data-testid="forms-mode"
          disabled={!forms || busy}
          value={mode}
          onChange={(event) => commit({ mode: event.target.value as FormsConfig["mode"], ...(event.target.value === "post" ? { format: "form" } : {}) })}
        >
          <option value="fetch">On the page: show a thank-you without leaving (the service must allow it)</option>
          <option value="post">Normal form post: the service shows its own thank-you page (works with any service)</option>
        </select>
      </label>
      <label className="field">
        <span>What the page sends</span>
        <select data-testid="forms-format" disabled={!forms || busy || mode === "post"} value={format} onChange={(event) => commit({ format: event.target.value as FormsConfig["format"] })}>
          <option value="form">Form fields (works almost everywhere)</option>
          <option value="json">JSON</option>
        </select>
      </label>
      <label className="field">
        <span>Fixed extra fields, one name=value per line (at most {MAX_FORM_HIDDEN})</span>
        <textarea
          rows={3}
          data-testid="forms-hidden"
          spellCheck={false}
          disabled={!forms || busy}
          value={hidden}
          onChange={(event) => {
            setHidden(event.target.value);
            commit({ hidden: textToHidden(event.target.value) });
          }}
        />
      </label>
      {hiddenProblem && forms ? (
        <p className="field-error" role="alert">
          {hiddenProblem} Not saved yet.
        </p>
      ) : null}
      {policy ? (
        <details data-testid="forms-policy">
          <summary>Security header your host must send</summary>
          <p className="hint">Opens a form post and one script to this one address, and nothing else. Serve it as Content-Security-Policy.</p>
          <pre className="code-block">{policy}</pre>
        </details>
      ) : (
        <p className="hint" data-testid="forms-no-address">
          No form address set. A form on a page prints but cannot send, and the site's policy stays fully shut.
        </p>
      )}
    </fieldset>
  );
}
