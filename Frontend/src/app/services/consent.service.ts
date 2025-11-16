import { Injectable } from '@angular/core';

export interface ConsentData {
  privacyAccepted: boolean;
  termsAccepted: boolean;
  timestamp: string;
  version: string; // Version der Datenschutzerklärung
  ipAddress?: string; // Optional für Nachweiszwecke
}

export interface ConsentPreferences {
  necessary: boolean; // Immer true
  functional: boolean;
  analytics: boolean; // In dieser App nicht verwendet
}

@Injectable({
  providedIn: 'root',
})
export class ConsentService {
  private readonly CONSENT_KEY = 'feueralarm_consent';
  private readonly CONSENT_VERSION = '1.0.0'; // Wird erhöht bei Änderungen der Datenschutzerklärung
  private readonly LAST_UPDATED = '16.11.2025';

  constructor() {
    console.log('🔐 ConsentService initialized');
  }

  /**
   * Prüft ob der User bereits eine gültige Zustimmung erteilt hat
   */
  hasValidConsent(): boolean {
    const consent = this.getConsent();

    if (!consent) {
      console.log('❌ Keine Zustimmung gefunden');
      return false;
    }

    // Prüfe ob die Version noch aktuell ist
    if (consent.version !== this.CONSENT_VERSION) {
      console.log(
        '⚠️ Zustimmung ist veraltet (Version:',
        consent.version,
        '→',
        this.CONSENT_VERSION,
        ')'
      );
      return false;
    }

    // Prüfe ob alle erforderlichen Zustimmungen vorhanden sind
    if (!consent.privacyAccepted) {
      console.log('❌ Datenschutzerklärung nicht akzeptiert');
      return false;
    }

    console.log('✅ Gültige Zustimmung vorhanden');
    return true;
  }

  /**
   * Speichert die Zustimmung des Users
   */
  saveConsent(privacyAccepted: boolean, termsAccepted: boolean = true): void {
    const consentData: ConsentData = {
      privacyAccepted,
      termsAccepted,
      timestamp: new Date().toISOString(),
      version: this.CONSENT_VERSION,
    };

    try {
      localStorage.setItem(this.CONSENT_KEY, JSON.stringify(consentData));
      console.log('✅ Zustimmung gespeichert:', consentData);
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Zustimmung:', error);
    }
  }

  /**
   * Lädt die gespeicherte Zustimmung
   */
  getConsent(): ConsentData | null {
    try {
      const consentString = localStorage.getItem(this.CONSENT_KEY);

      if (!consentString) {
        return null;
      }

      const consent = JSON.parse(consentString) as ConsentData;
      return consent;
    } catch (error) {
      console.error('❌ Fehler beim Laden der Zustimmung:', error);
      return null;
    }
  }

  /**
   * Widerruft die Zustimmung (Löscht alle Consent-Daten)
   */
  revokeConsent(): void {
    try {
      localStorage.removeItem(this.CONSENT_KEY);
      console.log('🗑️ Zustimmung widerrufen und gelöscht');
    } catch (error) {
      console.error('❌ Fehler beim Widerrufen der Zustimmung:', error);
    }
  }

  /**
   * Gibt die aktuelle Version der Datenschutzerklärung zurück
   */
  getCurrentVersion(): string {
    return this.CONSENT_VERSION;
  }

  /**
   * Gibt das letzte Update-Datum zurück
   */
  getLastUpdated(): string {
    return this.LAST_UPDATED;
  }

  /**
   * Prüft ob die Zustimmung erneuert werden muss (bei Version-Update)
   */
  needsRenewal(): boolean {
    const consent = this.getConsent();

    if (!consent) {
      return true;
    }

    return consent.version !== this.CONSENT_VERSION;
  }

  /**
   * Gibt Consent-Informationen als lesbaren String zurück
   */
  getConsentSummary(): string {
    const consent = this.getConsent();

    if (!consent) {
      return 'Keine Zustimmung erteilt';
    }

    const date = new Date(consent.timestamp).toLocaleString('de-DE');
    return `Zustimmung erteilt am ${date} (Version ${consent.version})`;
  }

  /**
   * Exportiert Consent-Daten (für Auskunftsrecht nach DSGVO)
   */
  exportConsentData(): string {
    const consent = this.getConsent();

    if (!consent) {
      return 'Keine Daten vorhanden';
    }

    return JSON.stringify(consent, null, 2);
  }

  /**
   * Prüft ob User mindestens einmal die Privacy-Seite besucht hat
   */
  hasVisitedPrivacyPage(): boolean {
    try {
      const visited = localStorage.getItem('feueralarm_privacy_visited');
      return visited === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Markiert Privacy-Seite als besucht
   */
  markPrivacyPageVisited(): void {
    try {
      localStorage.setItem('feueralarm_privacy_visited', 'true');
    } catch (error) {
      console.error('❌ Fehler beim Markieren der Privacy-Seite:', error);
    }
  }

  /**
   * Löscht ALLE app-bezogenen Daten (für kompletten Reset)
   */
  clearAllData(): void {
    try {
      // Consent-Daten
      localStorage.removeItem(this.CONSENT_KEY);
      localStorage.removeItem('feueralarm_privacy_visited');

      // Weitere App-Daten (falls vorhanden)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('feueralarm_')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));

      console.log('🗑️ Alle App-Daten gelöscht');
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Daten:', error);
    }
  }
}
