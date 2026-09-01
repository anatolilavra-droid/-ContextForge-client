import type { BundleMetrics, ForgeSettings, RepoFileMeta } from "../app/app-types";
import { PRESET_LABELS } from "../lib/defaults";
import { formatBytes, formatPercent } from "../lib/file-size";
import { fenceLanguageTag } from "../lib/language";
import { chooseFence } from "../lib/markdown";
import { buildTree, renderAsciiTree } from "./build-ascii-tree";

export interface BundleFileEntry {
  meta: RepoFileMeta;
  forgedContent: string;
}

export interface BuildBundleInput {
  settings: ForgeSettings;
  includedFiles: BundleFileEntry[];
  excludedFiles: RepoFileMeta[];
  allFilesForTree: RepoFileMeta[];
  metrics: BundleMetrics;
}

export function buildMarkdownBundle(input: BuildBundleInput): string {
  const { settings, includedFiles, excludedFiles, allFilesForTree, metrics } = input;
  const asciiTree = renderAsciiTree(buildTree(allFilesForTree), true);

  const lines: string[] = [];
  lines.push("# ContextForge Bundle");
  lines.push("");
  lines.push("> Generated locally by ContextForge");
  lines.push(`> Files included: ${metrics.filesIncluded}`);
  lines.push(`> Estimated GPT tokens: ${metrics.forgedTokensGpt.toLocaleString("en-US")}`);
  lines.push(`> Approximate Claude-equivalent tokens: ${metrics.approxClaudeTokensForged.toLocaleString("en-US")}`);
  lines.push(`> Compression: ${formatPercent(metrics.percentSaved)}`);
  lines.push(`> Profile: ${PRESET_LABELS[settings.preset]}`);
  lines.push("");
  lines.push("## Repository Map");
  lines.push("");
  lines.push("```text");
  lines.push(asciiTree);
  lines.push("```");
  lines.push("");
  lines.push("## Files");
  lines.push("");

  if (includedFiles.length === 0) {
    lines.push("_No files matched the current settings._");
    lines.push("");
  }

  for (const { meta, forgedContent } of includedFiles) {
    lines.push(`### \`${meta.path}\``);
    lines.push("");
    if (settings.toggles.addFileMetadata) {
      lines.push(
        `<!-- file: ${meta.path} | language: ${meta.language} | original size: ${formatBytes(meta.size)} -->`,
      );
      lines.push("");
    }
    const fence = chooseFence(forgedContent);
    lines.push(`${fence}${fenceLanguageTag(meta.language)}`);
    lines.push(forgedContent);
    lines.push(fence);
    lines.push("");
  }

  if (settings.toggles.showExcludedAppendix && excludedFiles.length > 0) {
    lines.push("## Excluded Files");
    lines.push("");
    lines.push("| Path | Reason |");
    lines.push("| --- | --- |");
    for (const file of excludedFiles) {
      const reason = file.exclusionReason?.detail ?? "Excluded";
      lines.push(`| \`${file.path}\` | ${reason.replace(/\|/g, "\\|")} |`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
