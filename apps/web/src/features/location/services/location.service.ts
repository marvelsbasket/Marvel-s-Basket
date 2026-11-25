import {
  LocationSuggestionItem,
  PaginatedResponse,
  PlaceSuggestionItem,
  ProductCardItem,
  PublicStoreItem,
  ReverseGeocodeResponse,
  ServiceabilityResolutionResponse,
} from '@marvels-basket/shared';
import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { CatalogQueryOptions } from '@/features/catalog/services/catalog.service';

export class LocationService {
  static async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<ReverseGeocodeResponse> {
    const res = await apiClient.post<ReverseGeocodeResponse>(ENDPOINTS.LOCATIONS.REVERSE_GEOCODE, {
      latitude,
      longitude,
    });
    return res.data!;
  }

  static async checkServiceability(query: {
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
  }): Promise<ServiceabilityResolutionResponse> {
    const params: Record<string, string | number> = {};
    if (query.postalCode) params.postalCode = query.postalCode;
    if (query.latitude !== undefined) params.latitude = query.latitude;
    if (query.longitude !== undefined) params.longitude = query.longitude;
    if (query.city) params.city = query.city;

    const res = await apiClient.get<ServiceabilityResolutionResponse>(
      ENDPOINTS.LOCATIONS.SERVICEABILITY,
      { params },
    );
    return res.data!;
  }

  static async getLocationSuggestions(q?: string): Promise<LocationSuggestionItem[]> {
    const res = await apiClient.get<LocationSuggestionItem[]>(ENDPOINTS.LOCATIONS.SUGGESTIONS, {
      params: q?.trim() ? { q: q.trim() } : undefined,
    });
    return res.data || [];
  }

  static async searchPlaces(q: string): Promise<PlaceSuggestionItem[]> {
    const clean = q.trim();
    if (clean.length < 2) return [];
    const res = await apiClient.get<PlaceSuggestionItem[]>(ENDPOINTS.LOCATIONS.PLACES, {
      params: { q: clean },
    });
    return res.data || [];
  }

  static async getNearbyStores(query: {
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    storeCategory?: string;
  }): Promise<PublicStoreItem[]> {
    const params: Record<string, string | number> = {};
    if (query.postalCode) params.postalCode = query.postalCode;
    if (query.latitude !== undefined) params.latitude = query.latitude;
    if (query.longitude !== undefined) params.longitude = query.longitude;
    if (query.city) params.city = query.city;
    if (query.storeCategory) params.storeCategory = query.storeCategory;

    const res = await apiClient.get<PublicStoreItem[]>(ENDPOINTS.STORES.NEARBY, { params });
    return res.data || [];
  }

  static async getStoreBySlug(
    slug: string,
    coords?: { latitude?: number; longitude?: number },
  ): Promise<PublicStoreItem> {
    const params: Record<string, number> = {};
    if (coords?.latitude !== undefined) params.latitude = coords.latitude;
    if (coords?.longitude !== undefined) params.longitude = coords.longitude;

    const res = await apiClient.get<PublicStoreItem>(ENDPOINTS.STORES.BY_SLUG(slug), {
      params: Object.keys(params).length ? params : undefined,
    });
    return res.data!;
  }

  static async getStoreProducts(
    slug: string,
    options?: CatalogQueryOptions,
  ): Promise<PaginatedResponse<ProductCardItem>> {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (options) {
      Object.entries(options).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          if (k === 'foodPreference' && v === 'ALL') return;
          params[k] = v;
        }
      });
    }

    const res = await apiClient.get<PaginatedResponse<ProductCardItem>>(
      ENDPOINTS.STORES.PRODUCTS(slug),
      { params },
    );
    return res.data!;
  }
}
