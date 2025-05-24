import { logger } from '../../../shared/utils/logger';

export abstract class BaseUseCase<TRequest, TResponse> {
  protected logger = logger.setContext({ useCase: this.constructor.name });

  abstract execute(request: TRequest): Promise<TResponse>;

  protected logExecutionStart(request: TRequest): void {
    this.logger.debug('Use case execution started', { request });
  }

  protected logExecutionEnd(response: TResponse): void {
    this.logger.debug('Use case execution completed');
  }

  protected logExecutionError(error: Error, request?: TRequest): void {
    this.logger.error('Use case execution failed', error, { request });
  }
}