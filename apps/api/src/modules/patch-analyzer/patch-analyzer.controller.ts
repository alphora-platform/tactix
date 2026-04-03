import { Controller, Get, Query } from '@nestjs/common';
import { PatchAnalyzerService } from './patch-analyzer.service';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('patch-analyzer')
export class PatchAnalyzerController {
  constructor(private readonly patchAnalyzerService: PatchAnalyzerService) {}

  @Get('predictions')
  async getPredictions(@Query('patch') patch: string) {
    return this.patchAnalyzerService.getPredictions(patch);
  }

  @Get('accuracy')
  async getAccuracy() {
    return this.patchAnalyzerService.getHistoricalAccuracy();
  }

  @Get('changes')
  async getChanges(@Query('patch') patch: string) {
    return this.patchAnalyzerService.getChangeBreakdown(patch);
  }
}
