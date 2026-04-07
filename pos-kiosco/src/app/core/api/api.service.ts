import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { KioskConfigService } from './kiosk-config.service';
import { Observable } from 'rxjs';


export type ApiOptions = {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private cfg = inject(KioskConfigService);

  private get baseUrl() {
    return this.cfg.current?.apiBaseUrl ?? environment.apiBaseUrl;
  }


  get<T>(path: string, params?: Record<string, any>, options?: ApiOptions) {
    const headers = new HttpHeaders(options?.headers ?? {});

    // Angular sabe convertir números a string internamente en fromObject
    const httpParams = new HttpParams({ fromObject: params ?? options?.params ?? {} });

    return this.http.get<T>(this.baseUrl + path, { headers, params: httpParams });
  }

  post<T>(path: string, body: any, options?: ApiOptions) {
    const headers = new HttpHeaders(options?.headers ?? {});
    const httpParams = new HttpParams({ fromObject: options?.params ?? {} });
    return this.http.post<T>(this.baseUrl + path, body, { headers, params: httpParams });
  }

  patch<T>(path: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body);
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`);
  }
}
