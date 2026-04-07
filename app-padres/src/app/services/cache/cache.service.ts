import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private readonly KEYS = {
    CHILDREN: 'mk_cache_children',
    PROFILE: 'mk_cache_profile',
    ACTIVITY: 'mk_cache_activity'
  };

  constructor() {}

  async set(key: string, value: any): Promise<void> {
    await Preferences.set({
      key,
      value: JSON.stringify(value)
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ key });
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      return null;
    }
  }

  async clearAll(): Promise<void> {
    await Preferences.clear();
  }

  // Helper methods for specific data
  async saveChildren(children: any[]): Promise<void> {
    await this.set(this.KEYS.CHILDREN, children);
  }

  async getChildren<T>(): Promise<T[] | null> {
    return await this.get<T[]>(this.KEYS.CHILDREN);
  }

  async saveProfile(profile: any): Promise<void> {
    await this.set(this.KEYS.PROFILE, profile);
  }

  async getProfile<T>(): Promise<T | null> {
    return await this.get<T>(this.KEYS.PROFILE);
  }

  async saveRecentActivity(activity: any[]): Promise<void> {
    await this.set(this.KEYS.ACTIVITY, activity);
  }

  async getRecentActivity<T>(): Promise<T[] | null> {
    return await this.get<T[]>(this.KEYS.ACTIVITY);
  }
}
