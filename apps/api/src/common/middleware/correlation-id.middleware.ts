import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from '../constants';
import { RequestWithCorrelation } from '../interfaces';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly validIdPattern = /^[a-zA-Z0-9_-]{8,64}$/;

  use(req: RequestWithCorrelation, res: Response, next: NextFunction): void {
    const rawId = req.headers[CORRELATION_ID_HEADER] || req.headers[REQUEST_ID_HEADER];

    let correlationId: string;
    if (typeof rawId === 'string' && this.validIdPattern.test(rawId)) {
      correlationId = rawId;
    } else {
      correlationId = uuidv4();
    }

    req.correlationId = correlationId;
    req.startTime = Date.now();
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }
}
