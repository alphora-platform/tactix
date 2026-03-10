import { getTraitName, formatRawName } from './gameAssets';
import type { TraitMetadata } from '../types/metadata';

/**
 * Resolves the best human-readable display name for a composition.
 *
 * Priority:
 * 1. `compLabel` from backend if it's already friendly (no TFT prefix)
 * 2. Parse `compLabel` parts through trait metadata if it contains TFT tokens
 * 3. Derive from `compId` segments as last-resort fallback
 */
export function resolveCompName(
  compId: string,
  compLabel: string | undefined,
  traits?: TraitMetadata
): string {
  // Case 1: backend already produced a friendly label
  if (compLabel && !compLabel.match(/\bTFT\d*_/i)) {
    return compLabel;
  }

  // Case 2: label contains raw TFT tokens — run each token through trait lookup
  if (compLabel) {
    const names = compLabel
      .split(/[\s_]+/)
      .map((part) => getTraitName(part, traits))
      .filter(Boolean);
    if (names.length > 0) return names.join(' ');
  }

  // Case 3: parse directly from comp_id
  // comp_id might look like "TFT16_BilgewaterPokies" or "bilgewater_piltover"
  const parts = compId
    .split(/[_\s]+/)
    // Drop pure set tokens like "TFT16", "TFT", "Set16"
    .filter((p) => !p.match(/^(TFT\d*|Set\d+)$/i));

  const names = parts.map((p) => getTraitName(p, traits) || formatRawName(p)).filter(Boolean);
  return names.join(' ') || compId;
}
