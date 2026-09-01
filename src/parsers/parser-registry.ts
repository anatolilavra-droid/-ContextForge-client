import type { Parser } from "web-tree-sitter";
import type { FileLanguage } from "../app/app-types";
import type { LanguageTransformSpec } from "../worker/transform-source";
import { goTransformSpec } from "./go-transform";
import { javascriptTransformSpec } from "./javascript-transform";
import { pythonTransformSpec } from "./python-transform";
import { rustTransformSpec } from "./rust-transform";
import { createParserForGrammar } from "./tree-sitter-loader";

const GRAMMAR_URLS: Partial<Record<FileLanguage, string>> = {
  javascript: `${import.meta.env.BASE_URL}grammars/tree-sitter-javascript.wasm`,
  typescript: `${import.meta.env.BASE_URL}grammars/tree-sitter-typescript.wasm`,
  tsx: `${import.meta.env.BASE_URL}grammars/tree-sitter-tsx.wasm`,
  python: `${import.meta.env.BASE_URL}grammars/tree-sitter-python.wasm`,
  go: `${import.meta.env.BASE_URL}grammars/tree-sitter-go.wasm`,
  rust: `${import.meta.env.BASE_URL}grammars/tree-sitter-rust.wasm`,
};

const TRANSFORM_SPECS: Partial<Record<FileLanguage, LanguageTransformSpec>> = {
  javascript: javascriptTransformSpec,
  typescript: javascriptTransformSpec,
  tsx: javascriptTransformSpec,
  python: pythonTransformSpec,
  go: goTransformSpec,
  rust: rustTransformSpec,
};

export function getTransformSpecFor(language: FileLanguage): LanguageTransformSpec | null {
  return TRANSFORM_SPECS[language] ?? null;
}

const parserCache = new Map<FileLanguage, Promise<Parser | null>>();

export function isAstEligible(language: FileLanguage): boolean {
  return language in GRAMMAR_URLS;
}

/**
 * Lazily loads the grammar for `language` on first use and caches the parser
 * instance. Resolves to null (never throws) when the grammar cannot be
 * loaded, so callers can fall back to safe text-only normalization.
 */
export function getParserFor(language: FileLanguage): Promise<Parser | null> {
  const url = GRAMMAR_URLS[language];
  if (!url) return Promise.resolve(null);

  let cached = parserCache.get(language);
  if (!cached) {
    cached = createParserForGrammar(url);
    parserCache.set(language, cached);
  }
  return cached;
}
