/**
 * Types for the `twilda:content` module that `twilda()` adds to an Astro project.
 * Reference it from `src/env.d.ts`: `/// <reference types="@twilda/astro/client" />`.
 */
declare module "twilda:content" {
  import type { LoadedContent } from "@twilda/core/node";
  import type { SiteSettings, renderDocument as RenderDocument, renderOptionsFor as RenderOptionsFor, themeCss as ThemeCss } from "@twilda/core";

  export const contentDir: string;
  export function loadPublished(): LoadedContent;
  export function loadSite(): SiteSettings;
  export const renderDocument: typeof RenderDocument;
  export const renderOptionsFor: typeof RenderOptionsFor;
  export const themeCss: typeof ThemeCss;
}
