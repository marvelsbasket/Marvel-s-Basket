import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthSummaryResult, ReadinessResult } from './health.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'General system health summary and metadata' })
  @ApiResponse({ status: 200, description: 'Service health summary' })
  getHealth(): HealthSummaryResult {
    return this.healthService.getSummary();
  }

  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe for process monitoring' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  getLiveness(): { status: 'ok'; timestamp: string } {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe verifying PostgreSQL and Redis dependencies' })
  @ApiResponse({ status: 200, description: 'All infrastructure dependencies are healthy' })
  @ApiResponse({ status: 503, description: 'One or more infrastructure dependencies are degraded' })
  async getReadiness(): Promise<ReadinessResult> {
    return this.healthService.getReadiness();
  }
}
