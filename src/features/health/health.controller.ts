import type { NextFunction, Request, Response } from 'express';

import type { HealthService } from './health.service';

export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  public readonly getHealth = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const health = await this.healthService.getHealth();

      response.status(200).json(health);
    } catch (error) {
      next(error);
    }
  };
}
