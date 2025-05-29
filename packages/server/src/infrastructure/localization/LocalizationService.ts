import { ILocalizationService } from '../../app/interfaces/services/ILocalizationService';
import { LocaleKeys } from './types/LocaleKeys';
import { logger } from '../../shared/utils/logger';
import { BaseError } from '../../shared/errors/BaseError';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import fs from 'fs/promises';
import path from 'path';

class LocalizationError extends BaseError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, {
      operation,
      originalError: originalError?.message
    });
  }
}

interface LocaleData {
  [key: string]: any;
}

export class LocalizationService implements ILocalizationService {
  private locales: Map<string, LocaleData> = new Map();
  private defaultLocale = 'en';
  private supportedLocales = ['en', 'ko', 'ja', 'zh'];
  private localesPath: string;
  private readonly logger = logger.setContext({ service: 'LocalizationService' });

  constructor() {
    this.localesPath = path.join(__dirname, 'locales');
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing localization service');
      
      // Load all supported locale files
      for (const locale of this.supportedLocales) {
        await this.loadLocale(locale);
      }
      
      this.logger.info('Localization service initialized successfully', {
        supportedLocales: this.supportedLocales,
        defaultLocale: this.defaultLocale
      });
    } catch (error) {
      this.logger.error('Failed to initialize localization service', { error });
      throw new LocalizationError(
        'Failed to initialize localization service',
        'initialize',
        error instanceof Error ? error : undefined
      );
    }
  }

  private async loadLocale(locale: string): Promise<void> {
    try {
      const filePath = path.join(this.localesPath, `${locale}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const localeData = JSON.parse(fileContent);
      
      this.locales.set(locale, localeData);
      
      this.logger.debug('Locale loaded successfully', { locale });
    } catch (error) {
      this.logger.error('Failed to load locale', { locale, error });
      throw new LocalizationError(
        `Failed to load locale: ${locale}`,
        'loadLocale',
        error instanceof Error ? error : undefined
      );
    }
  }

  public translate(key: LocaleKeys, locale?: string, variables?: Record<string, string>): string {
    try {
      const targetLocale = this.normalizeLocale(locale || this.defaultLocale);
      const localeData = this.locales.get(targetLocale) || this.locales.get(this.defaultLocale);
      
      if (!localeData) {
        this.logger.warn('No locale data found', { locale: targetLocale, key });
        return key;
      }

      const translation = this.getNestedValue(localeData, key);
      
      if (!translation) {
        this.logger.warn('Translation not found', { locale: targetLocale, key });
        return key;
      }

      // Replace variables in translation
      if (variables && typeof translation === 'string') {
        return this.replaceVariables(translation, variables);
      }

      return typeof translation === 'string' ? translation : key;
    } catch (error) {
      this.logger.error('Error translating key', { key, locale, error });
      return key;
    }
  }

  public t(key: LocaleKeys, locale?: string, variables?: Record<string, string>): string {
    return this.translate(key, locale, variables);
  }

  public getSupportedLocales(): string[] {
    return [...this.supportedLocales];
  }

  public getDefaultLocale(): string {
    return this.defaultLocale;
  }

  public isLocaleSupported(locale: string): boolean {
    const normalizedLocale = this.normalizeLocale(locale);
    return this.supportedLocales.includes(normalizedLocale);
  }

  public setDefaultLocale(locale: string): void {
    if (!this.isLocaleSupported(locale)) {
      throw new LocalizationError(
        `Unsupported locale: ${locale}`,
        'setDefaultLocale'
      );
    }
    
    this.defaultLocale = locale;
    this.logger.info('Default locale changed', { newDefaultLocale: locale });
  }

  private normalizeLocale(locale: string): string {
    // Extract language code from locale (e.g., 'en-US' -> 'en')
    const languageCode = locale.split('-')[0].toLowerCase();
    
    // Return the language code if it's supported, otherwise return default
    return this.supportedLocales.includes(languageCode) ? languageCode : this.defaultLocale;
  }

  private getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((current, keyPart) => {
      return current && current[keyPart] !== undefined ? current[keyPart] : null;
    }, obj);
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    
    Object.keys(variables).forEach(key => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(placeholder, variables[key]);
    });

    return result;
  }

  // Additional utility methods
  public getLocaleData(locale?: string): LocaleData | null {
    const targetLocale = this.normalizeLocale(locale || this.defaultLocale);
    return this.locales.get(targetLocale) || null;
  }

  public async reloadLocale(locale: string): Promise<void> {
    if (!this.isLocaleSupported(locale)) {
      throw new LocalizationError(
        `Cannot reload unsupported locale: ${locale}`,
        'reloadLocale'
      );
    }

    await this.loadLocale(locale);
    this.logger.info('Locale reloaded', { locale });
  }

  public async reloadAllLocales(): Promise<void> {
    this.logger.info('Reloading all locales');
    
    for (const locale of this.supportedLocales) {
      await this.loadLocale(locale);
    }
    
    this.logger.info('All locales reloaded successfully');
  }

  // Health check method
  public healthCheck(): { healthy: boolean; details: any } {
    const loadedLocales = Array.from(this.locales.keys());
    const missingLocales = this.supportedLocales.filter(locale => !loadedLocales.includes(locale));
    
    return {
      healthy: missingLocales.length === 0,
      details: {
        supportedLocales: this.supportedLocales,
        loadedLocales,
        missingLocales,
        defaultLocale: this.defaultLocale
      }
    };
  }
}