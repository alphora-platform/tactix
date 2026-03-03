import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ParticipantTrait } from '../../database/entities';

@Injectable()
export class CompDetectionService {
  /**
   * Identifies a comp from a participant's trait list.
   *
   * Only active traits (style > 0) are considered. Trait names are sorted
   * alphabetically and then hashed with MD5, producing a stable 16-char comp_id
   * that matches the one stored in mv_comp_stats.
   */
  identifyComp(traits: ParticipantTrait[]): string {
    const activeTraitNames = traits
      .filter((t) => t.style > 0)
      .map((t) => t.traitName)
      .sort();

    return createHash('md5').update(activeTraitNames.join(',')).digest('hex').slice(0, 16);
  }

  /**
   * Produces a human-readable label from the 2 most-played active trait names.
   *
   * Strips any game-set prefix (e.g. "Set16_") and joins the result.
   * Example: ["Set16_Bastion", "Set16_Bruiser"] → "Bastion Bruiser"
   */
  getCompLabel(traitCombo: string[] | null): string {
    if (!traitCombo || traitCombo.length === 0) {
      return 'Unknown';
    }

    const stripped = traitCombo.slice(0, 2).map((name) => name.replace(/^Set\d+_/, ''));

    return stripped.join(' ');
  }
}
