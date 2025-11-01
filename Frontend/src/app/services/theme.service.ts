import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private currentTheme = new BehaviorSubject<ThemeMode>('dark');
  private prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.initializeTheme();

    // System theme changes überwachen
    this.prefersDark.addEventListener('change', (mediaQuery) => {
      if (this.currentTheme.value === 'auto') {
        this.applyTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    });
  }

  private initializeTheme(): void {
    const savedTheme =
      (localStorage.getItem('app-theme') as ThemeMode) || 'dark';
    this.setTheme(savedTheme);
  }

  public setTheme(theme: ThemeMode): void {
    this.currentTheme.next(theme);
    localStorage.setItem('app-theme', theme);

    if (theme === 'auto') {
      this.applyTheme(this.prefersDark.matches ? 'dark' : 'light');
    } else {
      this.applyTheme(theme);
    }
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
  }

  public getTheme(): Observable<ThemeMode> {
    return this.currentTheme.asObservable();
  }

  public getCurrentTheme(): ThemeMode {
    return this.currentTheme.value;
  }

  public toggleTheme(): void {
    const current = this.currentTheme.value;
    if (current === 'auto') {
      this.setTheme('light');
    } else if (current === 'light') {
      this.setTheme('dark');
    } else {
      this.setTheme('auto');
    }
  }

  public getThemeIcon(): string {
    const current = this.currentTheme.value;
    return current === 'light'
      ? 'sunny'
      : current === 'dark'
      ? 'moon'
      : 'contrast';
  }
}
