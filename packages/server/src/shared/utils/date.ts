export class DateUtils {
  /**
   * Get current timestamp in milliseconds
   */
  public static now(): number {
    return Date.now();
  }

  /**
   * Get current date as ISO string
   */
  public static nowISO(): string {
    return new Date().toISOString();
  }

  /**
   * Add time to date
   */
  public static addTime(date: Date, amount: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): Date {
    const result = new Date(date);
    
    switch (unit) {
      case 'seconds':
        result.setSeconds(result.getSeconds() + amount);
        break;
      case 'minutes':
        result.setMinutes(result.getMinutes() + amount);
        break;
      case 'hours':
        result.setHours(result.getHours() + amount);
        break;
      case 'days':
        result.setDate(result.getDate() + amount);
        break;
    }
    
    return result;
  }

  /**
   * Check if date is expired
   */
  public static isExpired(date: Date): boolean {
    return date.getTime() < Date.now();
  }

  /**
   * Format date for display
   */
  public static formatForDisplay(date: Date, locale: string = 'en-US'): string {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get time difference in human readable format
   */
  public static getTimeDifference(from: Date, to: Date = new Date()): string {
    const diffMs = to.getTime() - from.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Check if date is today
   */
  public static isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Get start of day
   */
  public static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get end of day
   */
  public static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Parse ISO string safely
   */
  public static parseISO(isoString: string): Date | null {
    try {
      const date = new Date(isoString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
}