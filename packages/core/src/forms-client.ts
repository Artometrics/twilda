import { FORM_FIELD_MAX, FORM_MIN_FILL_MS } from "./forms";

/**
 * The one script a form page loads, as text. A site serves it as `/twilda-forms.js` (the starters
 * ship a route that does) so `script-src 'self'` is enough: nothing is inline, and a site with no form
 * never serves it.
 *
 * Without this file a form still works: it is a plain `<form method="post" action="https://...">` with
 * `required` fields, and the browser posts it. The script only adds what a plain form cannot:
 *
 * - the same field rules as `validateSubmission` in `forms.ts` (a test runs both on one corpus),
 *   with an error next to the field, `aria-invalid`, and focus on the first problem;
 * - the time trap: a submit under the minimum fill time is not sent, and the visitor is asked to press
 *   the button again (a human is never dropped silently);
 * - the honeypot: a filled hidden field gets a believable success and nothing is sent;
 * - in `fetch` mode, sending with `fetch` to the form's own action (`credentials: omit`, no referrer)
 *   and showing the success or the error on the page. In `post` mode it submits the plain form after
 *   checking, so the service's own thank-you page opens.
 *
 * It reads the endpoint from the form's `action`, so it cannot be pointed anywhere the page's
 * `form-action` and `connect-src` do not already allow. It never reads or sends anything but the form.
 */

const SOURCE = String.raw`(function () {
  "use strict";
  var MAX = __MAX__;
  var MIN_MS = __MIN_MS__;
  var EMAIL = /^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)$/;
  var CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029]/;
  var LINE_BREAK = /[\r\n\u0085\u2028\u2029]/;
  var ENCODED_BREAK = /%(?:0[ad]|00)/i;
  var PHONE = /^\+?[0-9][0-9 ().-]{4,28}[0-9]$/;

  function isSafeEmail(value) {
    if (value.length > MAX.email || LINE_BREAK.test(value) || CONTROL.test(value) || ENCODED_BREAK.test(value)) return false;
    if (/[\s,;<>()[\]\\":]/.test(value)) return false;
    var match = EMAIL.exec(value);
    if (!match) return false;
    return !match[1].split(".").some(function (label) { return label.toLowerCase().indexOf("xn--") === 0; });
  }

  function isSingleLine(value, max) {
    return value.length <= max && !LINE_BREAK.test(value) && !CONTROL.test(value) && !ENCODED_BREAK.test(value);
  }

  /** The message for a value that breaks the rules of its kind, or null. An empty optional value is fine. */
  function problem(kind, required, raw) {
    var value = kind === "message" ? raw.replace(/\r\n?/g, "\n").trim() : raw.trim();
    if (value === "") return required ? (kind === "consent" ? "Tick the box to continue." : "This field is required.") : null;
    if (value.length > MAX[kind]) return "Use at most " + MAX[kind] + " characters.";
    if (kind === "email") return isSafeEmail(value) ? null : "Enter an email address such as name@example.com.";
    if (kind === "phone") return PHONE.test(value) && (value.match(/\d/g) || []).length >= 6 ? null : "Enter a phone number with digits, spaces, + ( ) . or - only.";
    if (kind === "message") return CONTROL.test(value) || value.indexOf("\r") !== -1 ? "Remove the unusual characters." : null;
    if (kind === "consent") return value === "yes" ? null : "Tick the box to continue.";
    return isSingleLine(value, MAX[kind]) ? null : "Use one line of plain text.";
  }

  var rules = { problem: problem, isSafeEmail: isSafeEmail, MIN_MS: MIN_MS };
  if (typeof window !== "undefined") window.TwildaFormRules = rules;
  if (typeof document === "undefined") return;

  function one(root, selector) { return root.querySelector(selector); }

  function setError(input, message) {
    var out = document.getElementById(input.id + "-err");
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (out) { out.textContent = message; out.hidden = false; }
    } else {
      input.removeAttribute("aria-invalid");
      if (out) { out.textContent = ""; out.hidden = true; }
    }
  }

  function init(form) {
    if (form.getAttribute("data-tf-ready") === "1") return;
    form.setAttribute("data-tf-ready", "1");
    form.noValidate = true;
    var loadedAt = Date.now();
    var mode = form.getAttribute("data-tf-mode") === "post" ? "post" : "fetch";
    var format = form.getAttribute("data-tf-format") === "json" ? "json" : "form";
    var summary = one(form.parentNode, ".form-summary");
    var success = one(form.parentNode, ".form-success");
    var failure = one(form.parentNode, ".form-failure");
    var button = one(form, ".form-submit");
    var busy = false;

    function inputs() { return Array.prototype.slice.call(form.querySelectorAll("[data-tf-kind]")); }
    function valueOf(input) { return input.type === "checkbox" ? (input.checked ? "yes" : "") : input.value; }
    function say(message) { if (summary) { summary.textContent = message; summary.hidden = !message; } }
    function show(node) { if (node) { node.hidden = false; if (node.focus) node.focus(); } }

    inputs().forEach(function (input) {
      input.addEventListener("input", function () { setError(input, null); say(""); });
    });

    function finish(okay) {
      busy = false;
      if (button) { button.disabled = false; button.removeAttribute("aria-busy"); }
      if (okay) {
        form.hidden = true;
        if (failure) failure.hidden = true;
        say("");
        show(success);
      } else {
        show(failure);
      }
    }

    function payload() {
      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.disabled) return;
        if (el.type === "checkbox" && !el.checked) return;
        if (el.name === "_hp") return;
        data[el.name] = el.value;
      });
      data._elapsed_ms = String(Date.now() - loadedAt);
      data._page = location.pathname;
      return data;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (busy) return;
      if (failure) failure.hidden = true;
      var firstBad = null;
      inputs().forEach(function (input) {
        var message = problem(input.getAttribute("data-tf-kind"), input.required, valueOf(input));
        setError(input, message);
        if (message && !firstBad) firstBad = input;
      });
      if (firstBad) {
        say("Please fix the highlighted fields.");
        firstBad.focus();
        return;
      }
      var trap = one(form, "[name=_hp]");
      if (trap && trap.value !== "") { finish(true); return; }
      if (Date.now() - loadedAt < MIN_MS) {
        say("That was quick. Check your details, then press the button again.");
        return;
      }
      say("");
      if (mode === "post") {
        var extra = [["_elapsed_ms", String(Date.now() - loadedAt)], ["_page", location.pathname]];
        extra.forEach(function (pair) {
          var hidden = document.createElement("input");
          hidden.type = "hidden"; hidden.name = pair[0]; hidden.value = pair[1];
          form.appendChild(hidden);
        });
        form.submit();
        return;
      }
      busy = true;
      if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }
      var data = payload();
      var request = { method: "POST", credentials: "omit", referrerPolicy: "no-referrer", redirect: "follow", headers: { Accept: "application/json" } };
      if (format === "json") {
        request.headers["Content-Type"] = "application/json";
        request.body = JSON.stringify(data);
      } else {
        request.body = new URLSearchParams(data);
      }
      fetch(form.action, request).then(
        function (response) { finish(response.ok); },
        function () { finish(false); }
      );
    });
  }

  function start() { Array.prototype.forEach.call(document.querySelectorAll("form[data-tf]"), init); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
`;

/** The script text for `/twilda-forms.js`. Plain ES2017, no template, no network call of its own. */
export const FORMS_CLIENT_JS: string = `${SOURCE.replace("__MAX__", JSON.stringify(FORM_FIELD_MAX)).replace("__MIN_MS__", String(FORM_MIN_FILL_MS))}`;
