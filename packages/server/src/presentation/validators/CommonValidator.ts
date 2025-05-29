import { ValidationUtils } from '../../shared/utils/validation';
import { CONFIG } from '../../shared/constants/config';
import { logger } from '../../shared/utils/logger';
import { ValidationResult, ValidationError } from './AuthValidator';

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: string;
}

export interface SearchQuery extends PaginationQuery {
  q?: string;
  filter?: string;
}

export class CommonValidator {
  private readonly logger = logger.setContext({ validator: 'CommonValidator' });

  public validateObjectId(data: { id: string }): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      if (!data.id) {
        errors.push({
          field: 'id',
          value: data.id,
          constraint: 'required',
          message: 'ID is required'
        });
      } else if (typeof data.id !== 'string') {
        errors.push({
          field: 'id',
          value: data.id,
          constraint: 'type',
          message: 'ID must be a string'
        });
      } else if (!ValidationUtils.isValidObjectId(data.id)) {
        errors.push({
          field: 'id',
          value: data.id,
          constraint: 'format',
          message: 'Invalid ID format'
        });
      }

      this.logger.debug('ObjectId validation completed', {
        id: data.id,
        isValid: errors.length === 0
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during ObjectId validation', { error });
      throw error;
    }
  }

  public validatePagination(data: PaginationQuery): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // Page validation
      if (data.page !== undefined) {
        const page = parseInt(data.page, 10);
        if (isNaN(page)) {
          errors.push({
            field: 'page',
            value: data.page,
            constraint: 'type',
            message: 'Page must be a number'
          });
        } else if (page < 1) {
          errors.push({
            field: 'page',
            value: data.page,
            constraint: 'min',
            message: 'Page must be greater than 0'
          });
        }
      }

      // Limit validation
      if (data.limit !== undefined) {
        const limit = parseInt(data.limit, 10);
        if (isNaN(limit)) {
          errors.push({
            field: 'limit',
            value: data.limit,
            constraint: 'type',
            message: 'Limit must be a number'
          });
        } else if (limit < 1) {
          errors.push({
            field: 'limit',
            value: data.limit,
            constraint: 'min',
            message: 'Limit must be greater than 0'
          });
        } else if (limit > CONFIG.MAX_PAGE_SIZE) {
          errors.push({
            field: 'limit',
            value: data.limit,
            constraint: 'max',
            message: `Limit cannot exceed ${CONFIG.MAX_PAGE_SIZE}`
          });
        }
      }

      // Sort validation
      if (data.sort !== undefined) {
        if (typeof data.sort !== 'string') {
          errors.push({
            field: 'sort',
            value: data.sort,
            constraint: 'type',
            message: 'Sort field must be a string'
          });
        } else if (!ValidationUtils.isAlphanumeric(data.sort.replace(/[._-]/g, ''))) {
          errors.push({
            field: 'sort',
            value: data.sort,
            constraint: 'format',
            message: 'Invalid sort field format'
          });
        }
      }

      // Order validation
      if (data.order !== undefined) {
        if (!['asc', 'desc'].includes(data.order.toLowerCase())) {
          errors.push({
            field: 'order',
            value: data.order,
            constraint: 'enum',
            message: 'Order must be either "asc" or "desc"'
          });
        }
      }

      this.logger.debug('Pagination validation completed', {
        page: data.page,
        limit: data.limit,
        sort: data.sort,
        order: data.order,
        isValid: errors.length === 0
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during pagination validation', { error });
      throw error;
    }
  }

  public validateSearch(data: SearchQuery): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // First validate pagination parameters
      const paginationResult = this.validatePagination(data);
      errors.push(...paginationResult.errors);

      // Search query validation
      if (data.q !== undefined) {
        if (typeof data.q !== 'string') {
          errors.push({
            field: 'q',
            value: data.q,
            constraint: 'type',
            message: 'Search query must be a string'
          });
        } else if (data.q.trim().length === 0) {
          errors.push({
            field: 'q',
            value: data.q,
            constraint: 'length',
            message: 'Search query cannot be empty'
          });
        } else if (data.q.length > 100) {
          errors.push({
            field: 'q',
            value: data.q,
            constraint: 'length',
            message: 'Search query cannot exceed 100 characters'
          });
        }
      }

      // Filter validation
      if (data.filter !== undefined) {
        if (typeof data.filter !== 'string') {
          errors.push({
            field: 'filter',
            value: data.filter,
            constraint: 'type',
            message: 'Filter must be a string'
          });
        } else {
          // Basic JSON validation for filter
          try {
            JSON.parse(data.filter);
          } catch {
            errors.push({
              field: 'filter',
              value: data.filter,
              constraint: 'format',
              message: 'Filter must be valid JSON'
            });
          }
        }
      }

      this.logger.debug('Search validation completed', {
        hasQuery: data.q !== undefined,
        hasFilter: data.filter !== undefined,
        isValid: errors.length === 0
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during search validation', { error });
      throw error;
    }
  }

  public validateEmail(data: { email: string }): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      if (!data.email) {
        errors.push({
          field: 'email',
          value: data.email,
          constraint: 'required',
          message: 'Email is required'
        });
      } else if (typeof data.email !== 'string') {
        errors.push({
          field: 'email',
          value: data.email,
          constraint: 'type',
          message: 'Email must be a string'
        });
      } else if (!ValidationUtils.isValidEmail(data.email)) {
        errors.push({
          field: 'email',
          value: data.email,
          constraint: 'format',
          message: 'Invalid email format'
        });
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during email validation', { error });
      throw error;
    }
  }

  public validateUrl(data: { url: string }): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      if (!data.url) {
        errors.push({
          field: 'url',
          value: data.url,
          constraint: 'required',
          message: 'URL is required'
        });
      } else if (typeof data.url !== 'string') {
        errors.push({
          field: 'url',
          value: data.url,
          constraint: 'type',
          message: 'URL must be a string'
        });
      } else if (!ValidationUtils.isValidUrl(data.url)) {
        errors.push({
          field: 'url',
          value: data.url,
          constraint: 'format',
          message: 'Invalid URL format'
        });
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during URL validation', { error });
      throw error;
    }
  }

  public validateDateRange(data: { startDate?: string; endDate?: string }): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      // Start date validation
      if (data.startDate !== undefined) {
        if (!ValidationUtils.isValidDate(data.startDate)) {
          errors.push({
            field: 'startDate',
            value: data.startDate,
            constraint: 'format',
            message: 'Invalid start date format'
          });
        } else {
          startDate = new Date(data.startDate);
        }
      }

      // End date validation
      if (data.endDate !== undefined) {
        if (!ValidationUtils.isValidDate(data.endDate)) {
          errors.push({
            field: 'endDate',
            value: data.endDate,
            constraint: 'format',
            message: 'Invalid end date format'
          });
        } else {
          endDate = new Date(data.endDate);
        }
      }

      // Date range validation
      if (startDate && endDate && startDate > endDate) {
        errors.push({
          field: 'dateRange',
          value: { startDate: data.startDate, endDate: data.endDate },
          constraint: 'range',
          message: 'Start date must be before end date'
        });
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      this.logger.error('Error during date range validation', { error });
      throw error;
    }
  }
}