import type { ExclusionReason, RepoFileMeta } from "../app/app-types";
import { BUILTIN_IGNORE_PATTERNS } from "../lib/defaults";
import { dirNameOf, extensionOf, fileNameOf } from "../lib/file-path";
import { compileIgnorePatterns, matchIgnore, parseIgnoreFileContent } from "../lib/ignore";
import { classifyFile } from "./classify-files";
import type { IngestedFile } from "./ingest-files";

export interface IgnoreContext {
  respectGitignore: boolean;
  gitignoreContent: string | null;
  contextforgeignoreContent: string | null;
  customIgnorePatterns: string[];
  forceIncludePatterns: string[];
  toggles: {
    includeMarkdown: boolean;
    includeTests: boolean;
    includeConfig: boolean;
    includeLockFiles: boolean;
    excludeSourceMaps: boolean;
    excludeFixturesInMax: boolean;
  };
  limits: {
    maxFileSizeBytes: number;
    maxTotalSourceBytes: number;
  };
  isMaximumPreset: boolean;
}

const BUILTIN_COMPILED = compileIgnorePatterns(BUILTIN_IGNORE_PATTERNS);

export function classifyAndFilter(files: IngestedFile[], ctx: IgnoreContext): RepoFileMeta[] {
  const gitignoreCompiled =
    ctx.respectGitignore && ctx.gitignoreContent
      ? compileIgnorePatterns(parseIgnoreFileContent(ctx.gitignoreContent))
      : [];
  const contextforgeCompiled = ctx.contextforgeignoreContent
    ? compileIgnorePatterns(parseIgnoreFileContent(ctx.contextforgeignoreContent))
    : [];
  const customCompiled = compileIgnorePatterns(ctx.customIgnorePatterns);
  const forceIncludeCompiled = compileIgnorePatterns(ctx.forceIncludePatterns);

  const metas: RepoFileMeta[] = [];

  for (const f of files) {
    const { language, isConfig, isTest, isLockFile: isLock, isSourceMap: isMap } = classifyFile(
      f.path,
      f.isBinary,
    );

    let reason: ExclusionReason | null = null;

    if (f.readError) {
      reason = { code: "unreadable", detail: "The file could not be read and was skipped." };
    } else if (f.isBinary) {
      reason = { code: "binary-detected", detail: "Binary content detected while sampling the file." };
    } else {
      // Lock files and source maps are also matched by built-in patterns
      // ("*.lock", "*.map"), but their inclusion is meant to be governed by
      // the "Include lock files" / "Enable source-map exclusion" toggles
      // below -- skip the generic built-in match for them here rather than
      // have it silently override the toggle regardless of its value.
      const builtinMatch = isLock || isMap ? null : matchIgnore(f.path, BUILTIN_COMPILED);
      if (builtinMatch && !builtinMatch.negate) {
        reason = { code: "builtin-ignore", detail: `Matches built-in ignore pattern "${builtinMatch.pattern}".` };
      }

      const gitignoreMatch = matchIgnore(f.path, gitignoreCompiled);
      if (gitignoreMatch) {
        reason = gitignoreMatch.negate
          ? null
          : { code: "gitignore", detail: `Matches .gitignore pattern "${gitignoreMatch.pattern}".` };
      }

      const contextforgeMatch = matchIgnore(f.path, contextforgeCompiled);
      if (contextforgeMatch) {
        reason = contextforgeMatch.negate
          ? null
          : {
              code: "contextforgeignore",
              detail: `Matches .contextforgeignore pattern "${contextforgeMatch.pattern}".`,
            };
      }

      if (!reason) {
        if (isMap && ctx.toggles.excludeSourceMaps) {
          reason = { code: "excluded-sourcemap", detail: "Source map excluded by the source-map exclusion setting." };
        } else if (isLock && !ctx.toggles.includeLockFiles) {
          reason = { code: "excluded-lockfile", detail: 'Lock file excluded ("Include lock files" is off).' };
        } else if (language === "markdown" && !ctx.toggles.includeMarkdown) {
          reason = {
            code: "excluded-markdown",
            detail: 'Markdown/README file excluded ("Include Markdown & README files" is off).',
          };
        } else if (isTest && !ctx.toggles.includeTests) {
          reason = { code: "excluded-tests", detail: 'Test or fixture file excluded ("Include tests" is off).' };
        } else if (isConfig && !ctx.toggles.includeConfig) {
          reason = {
            code: "excluded-config",
            detail: 'Configuration file excluded ("Include configuration files" is off).',
          };
        } else if (isTest && ctx.isMaximumPreset && ctx.toggles.excludeFixturesInMax) {
          reason = {
            code: "excluded-fixture",
            detail: "Test fixture/example excluded by Maximum compression's fixture setting.",
          };
        }
      }

      const customMatch = matchIgnore(f.path, customCompiled);
      if (customMatch) {
        reason = customMatch.negate
          ? null
          : { code: "user-ignore", detail: `Matches your custom ignore pattern "${customMatch.pattern}".` };
      }

      const forceMatch = matchIgnore(f.path, forceIncludeCompiled);
      if (forceMatch && reason) {
        reason = null;
      }

      if (!reason && f.size > ctx.limits.maxFileSizeBytes) {
        reason = {
          code: "max-file-size",
          detail: `File exceeds the maximum file size setting (${f.size.toLocaleString("en-US")} bytes).`,
        };
      }
    }

    metas.push({
      id: f.path,
      path: f.path,
      name: fileNameOf(f.path),
      dirPath: dirNameOf(f.path),
      ext: extensionOf(f.path),
      size: f.size,
      language,
      isConfig,
      isTest,
      isLockFile: isLock,
      isSourceMap: isMap,
      included: reason === null,
      exclusionReason: reason,
    });
  }

  let cumulativeBytes = 0;
  for (const meta of [...metas].sort((a, b) => a.path.localeCompare(b.path))) {
    if (!meta.included) continue;
    cumulativeBytes += meta.size;
    if (cumulativeBytes > ctx.limits.maxTotalSourceBytes) {
      meta.included = false;
      meta.exclusionReason = {
        code: "max-total-size",
        detail: "Excluded to stay within the maximum total source size budget.",
      };
    }
  }

  return metas;
}
