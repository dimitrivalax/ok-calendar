import type { AxeResults, NodeResult } from 'axe-core';

function testIdsFromNode(node: NodeResult): string[] {
  const ids: string[] = [];
  for (const selector of node.target) {
    const text = String(selector);
    for (const match of text.matchAll(/data-testid=(?:\\?["'])([^"'\\]+)(?:\\?["'])/g)) {
      ids.push(match[1]);
    }
  }
  return ids;
}

/**
 * Stable fingerprint of axe violations.
 * Prefer rule + count + data-testid anchors over raw CSS selectors —
 * RN-web class names are too volatile for snapshots.
 * @see https://playwright.dev/docs/accessibility-testing#using-snapshots-to-allow-specific-known-issues
 */
export function violationFingerprints(results: AxeResults): string {
  const fingerprints = results.violations.map((violation) => {
    const testIds = [
      ...new Set(violation.nodes.flatMap((node) => testIdsFromNode(node))),
    ].sort();

    return {
      rule: violation.id,
      count: violation.nodes.length,
      ...(testIds.length > 0 ? { testIds } : {}),
    };
  });

  fingerprints.sort((a, b) => a.rule.localeCompare(b.rule));

  return JSON.stringify(fingerprints, null, 2);
}
