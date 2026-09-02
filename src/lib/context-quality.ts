import type { RepoFileMeta, ScanStats } from "../app/app-types";
import { isReadmeFile } from "./language";

export interface QualityCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ContextQualityReport {
  score: number;
  noisePercent: number;
  checks: QualityCheck[];
  recommendations: string[];
}

const ENTRY_POINT_PATTERNS: RegExp[] = [
  /(^|\/)index\.(ts|tsx|js|jsx|mjs|cjs)$/,
  /(^|\/)main\.(ts|tsx|js|py|go|rs)$/,
  /(^|\/)app\.(ts|tsx|js|py)$/,
  /(^|\/)server\.(ts|js|py)$/,
  /(^|\/)cmd\/[^/]+\/main\.go$/,
  /(^|\/)__init__\.py$/,
];

export function detectEntryPoints(files: RepoFileMeta[]): RepoFileMeta[] {
  return files.filter((file) => file.included && ENTRY_POINT_PATTERNS.some((pattern) => pattern.test(file.path)));
}

const RECOMMENDATIONS: Record<string, string> = {
  noise:
    "Tighten ignore rules or switch to a stricter preset -- a large share of scanned bytes is being excluded, which usually means generated or vendored content is still in the scan.",
  "entry-points": "Force-include your entry point file (e.g. src/index.ts) if it's being filtered out.",
  config: 'Turn on "Include config" so the model can see package.json/tsconfig/pyproject.toml/etc.',
  tests: 'Turn on "Include tests" if example usage or expected behavior would help the model.',
  types: "If this is a typed codebase, confirm .ts/.tsx files aren't being excluded by ignore rules.",
  readme: "Make sure README.md isn't filtered out -- it's usually the highest-density context you have.",
};

export function scoreContextQuality(stats: ScanStats, files: RepoFileMeta[]): ContextQualityReport {
  const noisePercent =
    stats.totalInputBytes > 0 ? Math.round((1 - stats.eligibleInputBytes / stats.totalInputBytes) * 100) : 0;

  const includedFiles = files.filter((file) => file.included);
  const configCount = includedFiles.filter((file) => file.isConfig).length;
  const testCount = includedFiles.filter((file) => file.isTest).length;
  const entryPoints = detectEntryPoints(files);
  const hasTypes = includedFiles.some(
    (file) => file.path.endsWith(".d.ts") || file.language === "typescript" || file.language === "tsx",
  );
  const readmeIncluded = includedFiles.some((file) => isReadmeFile(file.path));

  const checks: QualityCheck[] = [
    {
      id: "noise",
      label: "Low noise ratio",
      passed: noisePercent <= 40,
      detail: `${noisePercent}% of scanned bytes are excluded (dependencies, build output, binaries, etc.)`,
    },
    {
      id: "entry-points",
      label: "Entry point detected",
      passed: entryPoints.length > 0,
      detail:
        entryPoints.length > 0
          ? `Found ${entryPoints.length} likely entry point${entryPoints.length === 1 ? "" : "s"}: ${entryPoints
              .slice(0, 3)
              .map((file) => file.path)
              .join(", ")}`
          : "No obvious entry point (index/main/app/server) found among included files.",
    },
    {
      id: "config",
      label: "Config files included",
      passed: configCount > 0,
      detail:
        configCount > 0
          ? `${configCount} config file${configCount === 1 ? "" : "s"} included -- gives the model dependency and build context.`
          : "No config files included -- the model can't see your dependencies or build setup.",
    },
    {
      id: "tests",
      label: "Tests included",
      passed: testCount > 0,
      detail:
        testCount > 0
          ? `${testCount} test file${testCount === 1 ? "" : "s"} included -- shows the model expected behavior.`
          : "No test files included.",
    },
    {
      id: "types",
      label: "Type information present",
      passed: hasTypes,
      detail: hasTypes
        ? "TypeScript types are part of the included source."
        : "No TypeScript/type-definition files detected among included files.",
    },
    {
      id: "readme",
      label: "README included",
      passed: readmeIncluded,
      detail: readmeIncluded
        ? "README is included -- gives the model the project's own framing."
        : "No README included.",
    },
  ];

  const passedCount = checks.filter((check) => check.passed).length;
  const score = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0;
  const recommendations = checks.filter((check) => !check.passed).map((check) => RECOMMENDATIONS[check.id]);

  return { score, noisePercent, checks, recommendations };
}
