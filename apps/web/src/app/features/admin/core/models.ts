/** Types des réponses de l'API d'administration (lignes Prisma brutes, camelCase). */

export type AdminRole = 'ADMIN' | 'EDITEUR';

export interface AdminUserSummary {
  id: string;
  email: string;
  role: AdminRole;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AdminUserSummary;
}

/** Format d'erreur unique de l'API. */
export interface ApiErrorBody {
  code: string;
  message: string;
  field?: string;
}

export interface DeviceCategoryRow {
  id: string;
  name: string;
  iconKey: string | null;
  iconUrl: string | null;
  sortOrder: number;
  _count?: { devices: number };
}

export interface DeviceRow {
  id: string;
  categoryId: string;
  name: string;
  iconKey: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  powerMinW: number;
  powerTypW: number;
  powerMaxW: number;
  defaultHoursPerDay: number;
  dutyCycle: number;
  surgeFactor: number;
  active: boolean;
  sortOrder: number;
}

export interface CountryRow {
  id: string;
  isoCode: string;
  name: string;
  gridVoltageV: number;
  sortOrder: number;
}

export interface RegionRow {
  id: string;
  countryId: string;
  name: string;
  capital: string;
  latitude: number;
  longitude: number;
  irradiationAvg: number;
  irradiationMinMonth: number;
  source: string;
  updatedAt: string;
}

export interface ParameterSetRow {
  id: string;
  version: number;
  values: Record<string, unknown>;
  activeSince: string | null;
  createdById: string | null;
  createdAt: string;
  active?: boolean;
}

export interface AdminAccountRow {
  id: string;
  email: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  createdAt: string;
}

export interface SimulationStats {
  from: string;
  to: string;
  total: number;
  byMode: Record<string, number>;
  byRegion: { regionId: string; name: string; count: number }[];
  perDay: { day: string; count: number }[];
  topDevices: {
    deviceId: string;
    name: string;
    count: number;
    quantity: number;
  }[];
}

export type AuditAction =
  'create' | 'update' | 'delete' | 'deactivate' | 'activate' | 'upload';

export interface AuditLogItem {
  id: string;
  adminUserId: string | null;
  entity: string;
  entityId: string | null;
  action: AuditAction;
  before: unknown;
  after: unknown;
  createdAt: string;
  adminUser: { email: string } | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MediaUploadResponse {
  url: string;
  key: string;
  kind: 'icon' | 'image';
  contentType: string;
  size: number;
}
