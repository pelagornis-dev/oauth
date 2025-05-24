export interface ILocalizationService {
  translate(key: string, locale: string, params?: Record<string, any>): string;
  getAvailableLocales(): string[];
  setCurrentLocale(locale: string): void;
  getCurrentLocale(): string;
}