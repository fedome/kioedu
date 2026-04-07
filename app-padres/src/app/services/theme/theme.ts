import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly DARK_CLASS = 'dark';
  private readonly STORAGE_KEY = 'mk-theme-dark';

  constructor(@Inject(DOCUMENT) private document: Document) {
    // al crearse el servicio decide tema inicial
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === null) {
      const prefersDark = window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setDarkMode(prefersDark);
    } else {
      this.setDarkMode(saved === '1');
    }
  }

  setDarkMode(enabled: boolean) {
    const body = this.document.body;
    body.classList.toggle(this.DARK_CLASS, enabled);
    localStorage.setItem(this.STORAGE_KEY, enabled ? '1' : '0');
  }

  toggleDarkMode() {
    this.setDarkMode(!this.isDarkMode());
  }

  isDarkMode(): boolean {
    return this.document.body.classList.contains(this.DARK_CLASS);
  }
}
