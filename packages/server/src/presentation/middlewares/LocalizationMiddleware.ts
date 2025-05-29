import { Request, Response, NextFunction } from 'express';
import { ILocalizationService } from '../../app/interfaces/services/ILocalizationService';
import { logger } from '../../shared/utils/logger';

export class LocalizationMiddleware {
  private readonly logger = logger.setContext({ middleware: 'LocalizationMiddleware' });

  constructor(private localizationService: ILocalizationService) {}

  public detectLocale = (req: Request, res: Response, next: NextFunction): void => {
    try {
      let locale = this.localizationService.getDefaultLocale();

      // Priority order for locale detection:
      // 1. Query parameter (?locale=ko)
      // 2. Accept-Language header
      // 3. Default locale

      // Check query parameter first
      const queryLocale = req.query.locale as string;
      if (queryLocale && this.localizationService.isLocaleSupported(queryLocale)) {
        locale = queryLocale;
        this.logger.debug('Locale detected from query parameter', { locale, path: req.path });
      } else {
        // Check Accept-Language header
        const acceptLanguage = req.headers['accept-language'];
        if (acceptLanguage) {
          const preferredLocales = this.parseAcceptLanguage(acceptLanguage);
          
          for (const preferredLocale of preferredLocales) {
            if (this.localizationService.isLocaleSupported(preferredLocale.language)) {
              locale = preferredLocale.language;
              this.logger.debug('Locale detected from Accept-Language header', { 
                locale, 
                acceptLanguage,
                path: req.path 
              });
              break;
            }
          }
        }
      }

      // Set locale on request object
      req.locale = locale;

      this.logger.debug('Locale set for request', { 
        locale, 
        path: req.path,
        method: req.method 
      });

      next();
    } catch (error) {
      this.logger.error('Error in localization middleware', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path 
      });
      
      // Fallback to default locale on error
      req.locale = this.localizationService.getDefaultLocale();
      next();
    }
  };

  private parseAcceptLanguage(acceptLanguageHeader: string): Array<{ language: string; quality: number }> {
    try {
      const languages = acceptLanguageHeader
        .split(',')
        .map(lang => lang.trim())
        .map(lang => {
          const parts = lang.split(';');
          const language = parts[0].toLowerCase();
          const qualityMatch = parts[1]?.match(/q=([0-9.]+)/);
          const quality = qualityMatch ? parseFloat(qualityMatch[1]) : 1.0;
          
          return { language, quality };
        })
        .sort((a, b) => b.quality - a.quality); // Sort by quality (preference)

      return languages;
    } catch (error) {
      this.logger.warn('Failed to parse Accept-Language header', { 
        acceptLanguageHeader,
        error 
      });
      return [];
    }
  }

  // Utility method to add translation helper to response locals
  public addTranslationHelper = (req: Request, res: Response, next: NextFunction): void => {
    const locale = req.locale || this.localizationService.getDefaultLocale();
    
    // Add translation function to response locals
    res.locals.t = (key: string, variables?: Record<string, string>) => {
      return this.localizationService.translate(key as any, locale, variables);
    };
    
    res.locals.locale = locale;
    res.locals.supportedLocales = this.localizationService.getSupportedLocales();
    
    next();
  };
}