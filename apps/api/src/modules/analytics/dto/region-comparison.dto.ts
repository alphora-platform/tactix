// ── Per-region comp row ───────────────────────────────────────────────────

export class RegionalCompDto {
  comp_id!: string;
  label!: string;
  global_win_rate!: number;
  /** Win rate per region. Keys are uppercase region codes, e.g. KR, EUW, NA. */
  by_region!: Record<
    string,
    {
      win_rate: number;
      top4_rate: number;
      avg_placement: number;
      sample_size: number;
      /** 1-based rank within the region for this patch, by win_rate desc. */
      rank: number;
    }
  >;
  /**
   * max(win_rate) - min(win_rate) across participating regions.
   * Higher = bigger regional divergence.
   */
  regional_diff!: number;
}

/** Full response from GET /analytics/regions */
export class RegionalMetaDto {
  patch!: string;
  regions!: string[];
  comps!: RegionalCompDto[];
}

// ── Region-exclusive comps ────────────────────────────────────────────────

export class RegionalExclusiveDto {
  comp_id!: string;
  label!: string;
  /** The region where this comp is dominant (win_rate >= 50%). */
  strong_region!: string;
  strong_win_rate!: number;
  /** Average win_rate in all other queried regions. */
  other_regions_avg!: number;
  sample_size!: number;
}

// ── Head-to-head comparison ───────────────────────────────────────────────

export class CompHeadToHeadDto {
  comp_id!: string;
  label!: string;
  region_a_win_rate!: number;
  region_b_win_rate!: number;
  delta!: number; // regionA - regionB (positive = A is better)
  winner!: string; // regionA code, regionB code, or 'TIED'
}

export class ComparisonDto {
  region_a!: string;
  region_b!: string;
  patch!: string;
  /** 0–1. 1.0 = identical rank ordering, 0 = completely opposite metas. */
  meta_similarity!: number;
  comps!: CompHeadToHeadDto[];
}

// ── Query DTOs ────────────────────────────────────────────────────────────

export class RegionQueryDto {
  /** e.g. "14.3". Optional — defaults to current patch. */
  patch?: string;
  /**
   * Comma-separated region codes, e.g. "KR,EUW,NA".
   * Defaults to ['KR', 'EUW', 'NA'] when omitted.
   */
  regions?: string;
}

export class RegionCompareQueryDto {
  patch?: string;
  regionA?: string;
  regionB?: string;
}
