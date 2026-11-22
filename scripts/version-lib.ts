/**
 * The spec artifact version grammar (openspec/specs/schema-versioning, STO-001 and STO-002), shared by
 * check-version.ts and check-releases.ts. The version is MAJOR.MINOR.PATCH+oscal.<release>. It has no pre-release
 * label. This module has no side effect, so a script can import it.
 */

export const SEMVER_OSCAL =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)\+oscal\.((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;

export interface Version {
  text: string;
  core: [number, number, number];
  release: string;
}

export function parseVersion(text: string): Version | undefined {
  const m = SEMVER_OSCAL.exec(text.trim());
  if (!m) return undefined;
  return { text: text.trim(), core: [Number(m[1]), Number(m[2]), Number(m[3])], release: m[4] };
}

/** Semantic Versioning precedence. Build metadata takes no part. */
export function precedence(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i] - b.core[i];
  return 0;
}
