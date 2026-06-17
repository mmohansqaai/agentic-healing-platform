import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GeneratedLocatorCandidate } from './healing-types';

type PersistTarget = {
  filePath: string;
  methodName: string;
};

export type PersistOptions = {
  target: PersistTarget;
  candidate: GeneratedLocatorCandidate;
  minConfidence: number;
  validationPasses: number;
};

function escapeForSingleQuotedTsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildStrategySnippet(candidate: GeneratedLocatorCandidate): string {
  if (candidate.query.type === 'css') {
    return [
      '      {',
      `        name: '${candidate.strategyName}',`,
      `        resolve: (p) => p.locator('${escapeForSingleQuotedTsString(candidate.query.value)}').first(),`,
      '      },',
    ].join('\n');
  }
  return [
    '      {',
    `        name: '${candidate.strategyName}',`,
    `        resolve: (p) => p.getByRole('${candidate.query.role}', { name: /${candidate.query.name}/i }).first(),`,
    '      },',
  ].join('\n');
}

export function buildStrategySnippetForCandidate(candidate: GeneratedLocatorCandidate): string {
  return buildStrategySnippet(candidate);
}

export function previewPersistencePatch(
  options: PersistOptions
): { ok: true; snippet: string; filePath: string; methodName: string; strategyName: string } | { ok: false; reason: string } {
  const { target, candidate, minConfidence, validationPasses } = options;
  if (candidate.score < minConfidence) {
    return { ok: false, reason: `score ${candidate.score} below minimum ${minConfidence}` };
  }
  if (validationPasses < 2) {
    return { ok: false, reason: 'validationPasses must be >= 2 for safe persistence' };
  }
  const filePath = resolve(target.filePath);
  if (!existsSync(filePath)) {
    return { ok: false, reason: `target file not found: ${filePath}` };
  }
  const source = readFileSync(filePath, 'utf8');
  if (source.includes(`name: '${candidate.strategyName}'`)) {
    return { ok: false, reason: `strategy ${candidate.strategyName} already exists` };
  }
  const methodRegex = new RegExp(
    `private\\s+${target.methodName}\\s*\\(\\)\\s*:\\s*LocatorStrategy\\[\\]\\s*\\{[\\s\\S]*?return\\s*\\[([\\s\\S]*?)\\];[\\s\\S]*?\\}`,
    'm'
  );
  if (!methodRegex.test(source)) {
    return { ok: false, reason: `method not found or unsupported shape: ${target.methodName}` };
  }
  return {
    ok: true,
    snippet: buildStrategySnippet(candidate),
    filePath,
    methodName: target.methodName,
    strategyName: candidate.strategyName,
  };
}

export function persistGeneratedLocator(options: PersistOptions):
  | { ok: true; filePath: string; methodName: string; strategyName: string }
  | { ok: false; reason: string } {
  const { target, candidate, minConfidence, validationPasses } = options;
  if (candidate.score < minConfidence) {
    return { ok: false, reason: `score ${candidate.score} below minimum ${minConfidence}` };
  }
  if (validationPasses < 2) {
    return { ok: false, reason: 'validationPasses must be >= 2 for safe persistence' };
  }

  const filePath = resolve(target.filePath);
  if (!existsSync(filePath)) {
    return { ok: false, reason: `target file not found: ${filePath}` };
  }

  const source = readFileSync(filePath, 'utf8');
  if (source.includes(`name: '${candidate.strategyName}'`)) {
    return { ok: false, reason: `strategy ${candidate.strategyName} already exists` };
  }

  const methodRegex = new RegExp(
    `private\\s+${target.methodName}\\s*\\(\\)\\s*:\\s*LocatorStrategy\\[\\]\\s*\\{[\\s\\S]*?return\\s*\\[([\\s\\S]*?)\\];[\\s\\S]*?\\}`,
    'm'
  );
  const match = source.match(methodRegex);
  if (!match) {
    return { ok: false, reason: `method not found or unsupported shape: ${target.methodName}` };
  }

  const insertion = `\n${buildStrategySnippet(candidate)}\n`;
  const replaced = source.replace(methodRegex, (full, group1: string) => {
    const updatedBody = `${group1}${insertion}`;
    return full.replace(group1, updatedBody);
  });

  writeFileSync(filePath, replaced, 'utf8');

  const manifestPath = resolve(process.cwd(), 'playwright-report', 'auto-heal-manifest.json');
  const manifest = {
    persistedAt: new Date().toISOString(),
    filePath,
    methodName: target.methodName,
    strategyName: candidate.strategyName,
    query: candidate.query,
    score: candidate.score,
    reason: candidate.reason,
  };

  try {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  } catch {
    // best-effort only
  }

  return {
    ok: true,
    filePath,
    methodName: target.methodName,
    strategyName: candidate.strategyName,
  };
}

export function resolveRelativePagePath(filePath: string): string {
  const abs = resolve(filePath);
  return abs.startsWith(process.cwd()) ? abs.slice(process.cwd().length + 1) : abs;
}

export type { PersistTarget };
