export interface CompiledIgnorePattern {
  raw: string;
  negate: boolean;
  regex: RegExp;
}

const REGEX_SPECIAL = new Set(["." , "+", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]);

function globToRegExp(pattern: string): RegExp {
  // A pattern is root-anchored if it contains a "/" anywhere, including a
  // leading one (gitignore's explicit root-anchor marker) -- check this
  // before stripping that leading slash below, or "/dist" would wrongly
  // collapse to the unanchored pattern "dist" and match at any depth.
  const anchored = pattern.includes("/");
  let p = pattern;
  if (p.startsWith("/")) p = p.slice(1);

  let body = "";
  for (let i = 0; i < p.length; i += 1) {
    const c = p[i];
    if (c === "*") {
      if (p[i + 1] === "*") {
        i += 1;
        if (p[i + 1] === "/") {
          body += "(?:.*/)?";
          i += 1;
        } else {
          body += ".*";
        }
      } else {
        body += "[^/]*";
      }
    } else if (c === "?") {
      body += "[^/]";
    } else if (REGEX_SPECIAL.has(c)) {
      body += `\\${c}`;
    } else {
      body += c;
    }
  }

  const prefix = anchored ? "^" : "(?:^|.*/)";
  return new RegExp(`${prefix}${body}(?:/.*)?$`);
}

export function parseIgnoreFileContent(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

export function compileIgnorePatterns(patterns: string[]): CompiledIgnorePattern[] {
  return patterns
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0 && !raw.startsWith("#"))
    .map((raw) => {
      let pattern = raw;
      let negate = false;
      if (pattern.startsWith("!")) {
        negate = true;
        pattern = pattern.slice(1);
      }
      if (pattern.endsWith("/")) pattern = pattern.slice(0, -1);
      return { raw, negate, regex: globToRegExp(pattern) };
    });
}

export interface IgnoreMatch {
  pattern: string;
  negate: boolean;
}

/** Applies gitignore-style "last match wins" semantics within one pattern set. */
export function matchIgnore(path: string, compiled: CompiledIgnorePattern[]): IgnoreMatch | null {
  let result: IgnoreMatch | null = null;
  for (const entry of compiled) {
    if (entry.regex.test(path)) {
      result = { pattern: entry.raw, negate: entry.negate };
    }
  }
  return result;
}
