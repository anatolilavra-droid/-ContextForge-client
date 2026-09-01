import { Language, Parser } from "web-tree-sitter";

let initPromise: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = Parser.init({
      locateFile: () => `${import.meta.env.BASE_URL}tree-sitter.wasm`,
    });
  }
  return initPromise;
}

const languageCache = new Map<string, Promise<Language | null>>();

/** Loads (and caches) a grammar's .wasm asset. Never throws: failures resolve to null so callers can fall back safely. */
export function loadGrammar(wasmUrl: string): Promise<Language | null> {
  let cached = languageCache.get(wasmUrl);
  if (!cached) {
    cached = (async () => {
      try {
        await ensureInitialized();
        return await Language.load(wasmUrl);
      } catch {
        return null;
      }
    })();
    languageCache.set(wasmUrl, cached);
  }
  return cached;
}

export async function createParserForGrammar(wasmUrl: string): Promise<Parser | null> {
  const language = await loadGrammar(wasmUrl);
  if (!language) return null;
  try {
    const parser = new Parser();
    parser.setLanguage(language);
    return parser;
  } catch {
    return null;
  }
}
