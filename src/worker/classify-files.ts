import type { FileLanguage } from "../app/app-types";
import { classifyLanguage, isConfigFile, isLockFile, isSourceMapFile, isTestOrFixturePath } from "../lib/language";

export interface FileClassification {
  language: FileLanguage;
  isConfig: boolean;
  isTest: boolean;
  isLockFile: boolean;
  isSourceMap: boolean;
}

export function classifyFile(path: string, isBinary: boolean): FileClassification {
  return {
    language: isBinary ? "binary" : classifyLanguage(path),
    isConfig: isConfigFile(path),
    isTest: isTestOrFixturePath(path),
    isLockFile: isLockFile(path),
    isSourceMap: isSourceMapFile(path),
  };
}
