import type { APIRequestContext } from '@playwright/test';
import type { AuthRole } from './auth';
import { getAuthHeaders } from './auth';
import { getApiBaseUrl } from './env';

type Json = Record<string, unknown> | unknown[] | null;

export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly apiBaseUrl: string = getApiBaseUrl(),
  ) {}

  private url(path: string): string {
    const p = path.startsWith('/') ? path.slice(1) : path;
    return `${this.apiBaseUrl.replace(/\/$/, '')}/${p}`;
  }

  private mergeJsonHeaders(
    role: AuthRole,
    extra?: Record<string, string>,
  ): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...getAuthHeaders(role),
      ...extra,
    };
  }

  get(
    path: string,
    role: AuthRole,
    options?: {
      params?: Record<string, string | number | boolean>;
    },
  ) {
    return this.request.get(this.url(path), {
      headers: { ...getAuthHeaders(role) },
      params: options?.params,
    });
  }

  post(path: string, role: AuthRole, body: Json) {
    return this.request.post(this.url(path), {
      data: body as object,
      headers: this.mergeJsonHeaders(role),
    });
  }
}

export function createApiClient(request: APIRequestContext, apiBaseUrl?: string) {
  return new ApiClient(request, apiBaseUrl);
}
