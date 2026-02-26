import { Injectable } from '@nestjs/common';
import { PlacementAnalysisService } from './placement-analysis.service';
import { CompProficiencyService } from './comp-proficiency.service';
import { EconCurveService } from './econ-curve.service';
import { ItemEfficiencyService } from './item-efficiency.service';
import { TiltDetectionService } from './tilt-detection.service';
import { WeaknessReportService } from './weakness-report.service';
import {
  PlacementDistributionDto,
  RecentGameDto,
  CompProficiencyDto,
} from './dto/tracker-response.dto';
import type {
  EconCurveDto,
  ItemEfficiencyDto,
  TiltReportDto,
  WeaknessReportDto,
} from './dto/tracker-advanced.dto';

/**
 * TrackerService — public facade for the tracker module.
 *
 * Delegates all heavy work to the specialised sub-services so the controller
 * stays thin and downstream modules only need to import TrackerModule to
 * access player tracking functionality.
 */
@Injectable()
export class TrackerService {
  constructor(
    private readonly placementAnalysis: PlacementAnalysisService,
    private readonly compProficiency: CompProficiencyService,
    private readonly econCurve: EconCurveService,
    private readonly itemEfficiency: ItemEfficiencyService,
    private readonly tiltDetection: TiltDetectionService,
    private readonly weaknessReport: WeaknessReportService
  ) {}

  // ── Existing ──────────────────────────────────────────────────────────

  getPlacementDistribution(puuid: string, patch?: string): Promise<PlacementDistributionDto> {
    return this.placementAnalysis.getPlacementDistribution(puuid, patch);
  }

  getRecentGames(puuid: string, limit = 20): Promise<RecentGameDto[]> {
    return this.placementAnalysis.getRecentGames(puuid, limit);
  }

  getCompProficiency(puuid: string, patch?: string): Promise<CompProficiencyDto[]> {
    return this.compProficiency.getCompProficiency(puuid, patch);
  }

  // ── New ───────────────────────────────────────────────────────────────

  getEconCurve(puuid: string, compId?: string, patch?: string): Promise<EconCurveDto> {
    return this.econCurve.getEconCurve(puuid, compId, patch);
  }

  getItemEfficiency(puuid: string, patch?: string): Promise<ItemEfficiencyDto[]> {
    return this.itemEfficiency.getItemEfficiency(puuid, patch);
  }

  detectTilt(puuid: string, lastN = 20): Promise<TiltReportDto> {
    return this.tiltDetection.detectTilt(puuid, lastN);
  }

  generateWeeklyReport(puuid: string): Promise<WeaknessReportDto> {
    return this.weaknessReport.generateWeeklyReport(puuid);
  }
}
