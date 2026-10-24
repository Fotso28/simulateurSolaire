import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE } from './api-error';
import { MediaUploadResponse } from './models';

type QueryValue = string | number | boolean | null | undefined;

/** Accès typé aux routes `/api/v1/admin/**` (le jeton est ajouté par l'intercepteur). */
@Injectable()
export class AdminApiService {
  private readonly http = inject(HttpClient);

  list<T>(path: string, query: Record<string, QueryValue> = {}): Observable<T> {
    return this.http.get<T>(this.url(path), { params: toParams(query) });
  }

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(this.url(path));
  }

  create<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  update<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }

  remove<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  uploadMedia(
    file: File,
    kind: 'icon' | 'image',
  ): Observable<MediaUploadResponse> {
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', file);
    return this.http.post<MediaUploadResponse>(this.url('media'), form);
  }

  private url(path: string): string {
    return `${API_BASE}/admin/${path.replace(/^\/+/, '')}`;
  }
}

function toParams(query: Record<string, QueryValue>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}
