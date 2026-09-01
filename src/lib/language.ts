import type { FileLanguage } from "../app/app-types";
import { extensionOf, fileNameOf } from "./file-path";

const EXTENSION_LANGUAGE: Record<string, FileLanguage> = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  py: "python",
  pyi: "python",
  go: "go",
  rs: "rust",
  md: "markdown",
  mdx: "markdown",
  json: "json",
  jsonc: "json",
  yml: "yaml",
  yaml: "yaml",
  css: "css",
  scss: "css",
  html: "html",
  htm: "html",
};

const TEXTUAL_FALLBACK_EXTENSIONS = new Set([
  "txt",
  "toml",
  "ini",
  "cfg",
  "conf",
  "env",
  "sh",
  "bash",
  "zsh",
  "sql",
  "graphql",
  "gql",
  "xml",
  "vue",
  "svelte",
  "java",
  "kt",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "rb",
  "php",
  "swift",
]);

const PRIMARY_OPTIMIZED_LANGUAGES = new Set<FileLanguage>([
  "javascript",
  "typescript",
  "tsx",
  "python",
  "go",
  "rust",
  "markdown",
  "json",
]);

export function classifyLanguage(path: string): FileLanguage {
  const ext = extensionOf(path);
  if (ext in EXTENSION_LANGUAGE) return EXTENSION_LANGUAGE[ext];
  if (TEXTUAL_FALLBACK_EXTENSIONS.has(ext)) return "text";
  return "unknown";
}

export function isPrimaryOptimizedLanguage(language: FileLanguage): boolean {
  return PRIMARY_OPTIMIZED_LANGUAGES.has(language);
}

const CONFIG_FILENAME_PATTERNS: RegExp[] = [
  /^package(-lock)?\.json$/,
  /^tsconfig.*\.json$/,
  /^vite\.config\.(t|j)sx?$/,
  /^webpack\.config\.(t|j)s$/,
  /^rollup\.config\.(t|j)s$/,
  /^babel\.config\.(t|j)s$/,
  /^\.babelrc(\.json)?$/,
  /^\.eslintrc(\.(json|js|cjs|yml|yaml))?$/,
  /^eslint\.config\.(t|j)s$/,
  /^\.prettierrc(\.(json|js|cjs|yml|yaml))?$/,
  /^jest\.config\.(t|j)s$/,
  /^vitest\.config\.(t|j)s$/,
  /^tailwind\.config\.(t|j)s$/,
  /^postcss\.config\.(t|j)s$/,
  /^cargo\.toml$/,
  /^go\.(mod|sum)$/,
  /^pyproject\.toml$/,
  /^requirements.*\.txt$/,
  /^setup\.(py|cfg)$/,
  /^dockerfile$/,
  /^docker-compose.*\.ya?ml$/,
  /^makefile$/,
  /^\.env(\..+)?$/,
  /^\.editorconfig$/,
  /^\.gitattributes$/,
];

export function isConfigFile(path: string): boolean {
  const name = fileNameOf(path).toLowerCase();
  return CONFIG_FILENAME_PATTERNS.some((pattern) => pattern.test(name));
}

const TEST_PATH_PATTERN = /(^|\/)(tests?|__tests__|__mocks__|spec|fixtures?|examples?)(\/|$)|\.(test|spec)\.[^/]+$/i;

export function isTestOrFixturePath(path: string): boolean {
  return TEST_PATH_PATTERN.test(path);
}

export function isLockFile(path: string): boolean {
  const name = fileNameOf(path).toLowerCase();
  return (
    name.endsWith(".lock") ||
    name === "package-lock.json" ||
    name === "yarn.lock" ||
    name === "pnpm-lock.yaml" ||
    name === "cargo.lock" ||
    name === "poetry.lock" ||
    name === "gemfile.lock"
  );
}

export function isSourceMapFile(path: string): boolean {
  return path.endsWith(".map");
}

export function isReadmeFile(path: string): boolean {
  return /^readme(\.[a-z0-9]+)?$/i.test(fileNameOf(path));
}

const FENCE_LANGUAGE_TAG: Partial<Record<FileLanguage, string>> = {
  javascript: "javascript",
  typescript: "typescript",
  tsx: "tsx",
  python: "python",
  go: "go",
  rust: "rust",
  markdown: "markdown",
  json: "json",
  yaml: "yaml",
  css: "css",
  html: "html",
  text: "text",
};

export function fenceLanguageTag(language: FileLanguage): string {
  return FENCE_LANGUAGE_TAG[language] ?? "text";
}
