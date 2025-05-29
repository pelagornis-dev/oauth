import { LocaleKeys } from '../../../infrastructure/localization/types/LocaleKeys';

export interface ILocalizationService {
  /**
   * Translate a key to the specified locale
   */
  translate(key: LocaleKeys, locale?: string, variables?: Record<string, string>): string;

  /**
   * Short alias for translate method
   */
  t(key: LocaleKeys, locale?: string, variables?: Record<string, string>): string;

  /**
   * Get list of supported locales
   */
  getSupportedLocales(): string[];

  /**
   * Get the default locale
   */
  getDefaultLocale(): string;

  /**
   * Check if a locale is supported
   */
  isLocaleSupported(locale: string): boolean;

  /**
   * Set the default locale
   */
  setDefaultLocale(locale: string): void;

  /**
   * Health check for the localization service
   */
  healthCheck(): { healthy: boolean; details: any };
}