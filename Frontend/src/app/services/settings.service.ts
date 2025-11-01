import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppSettings } from '../interfaces/settings.interface';
import { TeacherState } from '../interfaces/teacher.interface';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly STORAGE_KEY = 'app-settings';

  private defaultSettings: AppSettings = {
    sortBy: 'teacher',
    showNotifications: true,
    defaultStatus: 'all',
    theme: 'dark',
  };

  private settingsSubject = new BehaviorSubject<AppSettings>(
    this.defaultSettings
  );
  private chosenArchive: string | undefined;
  private liveArchive: string | undefined;

  constructor() {
    this.loadSettings();
  }

  // ==========================================
  // SETTINGS MANAGEMENT
  // ==========================================

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        this.settingsSubject.next({ ...this.defaultSettings, ...settings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  private saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      this.settingsSubject.next(settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  getSettings(): Observable<AppSettings> {
    return this.settingsSubject.asObservable();
  }

  getCurrentSettings(): AppSettings {
    return this.settingsSubject.value;
  }

  updateSettings(partial: Partial<AppSettings>): void {
    const current = this.settingsSubject.value;
    const updated = { ...current, ...partial };
    this.saveSettings(updated);
  }

  resetSettings(): void {
    this.saveSettings(this.defaultSettings);
  }

  // ==========================================
  // SORT BY
  // ==========================================

  setSortBy(sortBy: 'teacher' | 'class'): void {
    this.updateSettings({ sortBy });
  }

  getSortBy(): 'teacher' | 'class' {
    return this.settingsSubject.value.sortBy;
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  setNotifications(enabled: boolean): void {
    this.updateSettings({ showNotifications: enabled });
  }

  getNotifications(): boolean {
    return this.settingsSubject.value.showNotifications;
  }

  // ==========================================
  // DEFAULT STATUS
  // ==========================================

  setDefaultStatus(status: TeacherState | 'all'): void {
    this.updateSettings({ defaultStatus: status });
  }

  getDefaultStatus(): TeacherState | 'all' {
    return this.settingsSubject.value.defaultStatus;
  }

  getDefaultStatusAsNumber(): number {
    const status = this.getDefaultStatus();
    return status === 'all' ? 4 : status;
  }

  // ==========================================
  // ARCHIVE SELECTION
  // ==========================================

  setChosenArchive(archiveId: string): void {
    this.chosenArchive = archiveId;
    this.updateSettings({ selectedArchive: archiveId });
  }

  getChosenArchive(): string | undefined {
    return this.chosenArchive || this.settingsSubject.value.selectedArchive;
  }

  setLiveArchive(archiveId: string): void {
    this.liveArchive = archiveId;
  }

  getLiveArchive(): string | undefined {
    return this.liveArchive;
  }

  isViewingLiveArchive(): boolean {
    return this.chosenArchive === this.liveArchive;
  }
}
