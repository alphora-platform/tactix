import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface Delta {
  field: string;
  before?: string;
  after?: string;
  direction: 'up' | 'down' | 'neutral';
}

export interface ChangeEntry {
  entityName: string;
  entityType: 'unit' | 'trait' | 'augment' | 'item';
  changeType: 'buff' | 'nerf' | 'adjust';
  details: string[]; // Keep raw detail lines
  deltas?: Delta[];
}

export interface PatchNotesRaw {
  version: string;
  html: string;
}

@Injectable()
export class PatchNotesParserService {
  private readonly logger = new Logger(PatchNotesParserService.name);

  async fetchPatchNotes(patchVersion: string): Promise<PatchNotesRaw> {
    // version format like "14.3" -> url "14-3"
    const urlVersion = patchVersion.replace(/\./g, '-');
    const url = `https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-${urlVersion}-notes/`;
    this.logger.debug(`Fetching patch notes from: ${url}`);

    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      return { version: patchVersion, html: res.data };
    } catch (err) {
      this.logger.error(
        `Failed to fetch patch notes for ${patchVersion}: ${(err as Error).message}`
      );
      throw err;
    }
  }

  parseDelta(raw: string): Delta {
    // Expected raw pattern: "Health: 500 ⇒ 600"
    let direction: 'up' | 'down' | 'neutral' = 'neutral';

    const lowerRaw = raw.toLowerCase();
    if (lowerRaw.includes('+') || lowerRaw.includes('increased') || lowerRaw.includes('buff')) {
      direction = 'up';
    } else if (
      lowerRaw.includes('-') ||
      lowerRaw.includes('decreased') ||
      lowerRaw.includes('nerf')
    ) {
      direction = 'down';
    } else if (lowerRaw.includes('changed') || lowerRaw.includes('reworked')) {
      direction = 'neutral';
    }

    const arrowIdx = raw.indexOf('⇒');
    if (arrowIdx !== -1) {
      const leftPart = raw.substring(0, arrowIdx).trim();
      const rightPart = raw.substring(arrowIdx + 1).trim();

      const colonIdx = leftPart.indexOf(':');
      let field = 'Unknown';
      let before = leftPart;

      if (colonIdx !== -1) {
        field = leftPart.substring(0, colonIdx).trim();
        before = leftPart.substring(colonIdx + 1).trim();
      } else {
        field = leftPart;
      }

      const numBefore = parseFloat(before.replace(/[^0-9.-]/g, ''));
      const numAfter = parseFloat(rightPart.replace(/[^0-9.-]/g, ''));

      if (!isNaN(numBefore) && !isNaN(numAfter)) {
        if (numAfter > numBefore) direction = 'up';
        else if (numAfter < numBefore) direction = 'down';
      }

      return {
        field,
        before,
        after: rightPart,
        direction,
      };
    }

    return {
      field: raw.split(':')[0] || 'Unknown',
      direction,
    };
  }

  parseHtmlToChanges(html: string): ChangeEntry[] {
    const entries: ChangeEntry[] = [];
    // very rudimentary parsing to satisfy "extract sections"
    // Just looking for <li> with ⇒ in them for simplicity of demonstration,
    // and assume entity is the first word before colon
    const liMatches = html.match(/<li>(.*?)<\/li>/g);
    if (!liMatches) return entries;

    for (const li of liMatches) {
      const cleanText = li
        .replace(/<[^>]+>/g, '')
        .trim()
        .replace(/&amp;/g, '&');
      if (cleanText.includes('⇒')) {
        const delta = this.parseDelta(cleanText);
        const entityName = delta.field.split(' ')[0] || 'Unknown';

        let changeType: 'buff' | 'nerf' | 'adjust' = 'adjust';
        if (delta.direction === 'up') changeType = 'buff';
        else if (delta.direction === 'down') changeType = 'nerf';

        entries.push({
          entityName,
          entityType: 'unit', // To be robust, one would need section context
          changeType,
          details: [cleanText],
          deltas: [delta],
        });
      }
    }
    return entries;
  }
}
