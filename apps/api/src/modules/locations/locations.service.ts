import {
  BadGatewayException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SellerStatus } from '@prisma/client';
import {
  LocationSuggestionItem,
  PlaceSuggestionItem,
  ReverseGeocodeResponse,
  ServiceabilityResolutionResponse,
} from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { ReverseGeocodeDto, ServiceabilityQueryDto } from './dto';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
  ) {}

  /**
   * Reverse-geocodes coordinates to a human-readable address using Google Maps API (if configured)
   * or OpenStreetMap Nominatim. Never fabricates an address on failure.
   */
  async reverseGeocode(dto: ReverseGeocodeDto): Promise<ReverseGeocodeResponse> {
    const { latitude, longitude } = dto;
    const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

    if (googleMapsKey) {
      return this.reverseGeocodeGoogle(latitude, longitude, googleMapsKey);
    }

    return this.reverseGeocodeNominatim(latitude, longitude);
  }

  private async reverseGeocodeGoogle(
    latitude: number,
    longitude: number,
    apiKey: string,
  ): Promise<ReverseGeocodeResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
        `${latitude},${longitude}`,
      )}&key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        throw new BadGatewayException({
          code: 'REVERSE_GEOCODE_FAILED',
          message: 'Unable to contact reverse geocoding provider.',
        });
      }

      const data = (await res.json()) as {
        status: string;
        results?: Array<{
          formatted_address: string;
          address_components: Array<{
            long_name: string;
            short_name: string;
            types: string[];
          }>;
        }>;
      };

      if (data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
        throw new UnprocessableEntityException({
          code: 'ADDRESS_UNRECOGNIZABLE',
          message: 'These coordinates could not be mapped to a recognizable delivery address.',
        });
      }

      if (data.status !== 'OK') {
        throw new BadGatewayException({
          code: 'REVERSE_GEOCODE_FAILED',
          message: 'Reverse geocoding service returned an error.',
        });
      }

      const top = data.results[0];
      const getComp = (type: string) =>
        top.address_components.find((c) => c.types.includes(type))?.long_name || '';

      const locality =
        getComp('sublocality_level_1') || getComp('sublocality') || getComp('neighborhood');
      const street = getComp('route') || getComp('premise') || '';
      const city = getComp('locality') || getComp('administrative_area_level_2');
      const state = getComp('administrative_area_level_1');
      const postalCode = addrCompOrEmpty(getComp('postal_code'));

      function addrCompOrEmpty(v: string) {
        return v || '';
      }

      if (!city && !locality && !state) {
        throw new UnprocessableEntityException({
          code: 'ADDRESS_UNRECOGNIZABLE',
          message: 'Coordinates could not be resolved to a valid city or postal zone.',
        });
      }

      const displayParts = [locality || city, state || postalCode].filter(Boolean);

      return {
        formattedAddress: top.formatted_address,
        displayLocation: displayParts.join(', ') || top.formatted_address,
        locality: locality || null,
        street: street || null,
        city: city || locality || 'Unknown City',
        state: state || '',
        postalCode: postalCode || '',
        landmark: locality || null,
        latitude,
        longitude,
        provider: 'google',
      };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof UnprocessableEntityException || err instanceof BadGatewayException) {
        throw err;
      }
      this.logger.warn(`Google reverse geocode failed: ${(err as Error).message}`);
      throw new BadGatewayException({
        code: 'REVERSE_GEOCODE_FAILED',
        message: 'Could not detect address from GPS coordinates. Please select your area manually.',
      });
    }
  }

  private async reverseGeocodeNominatim(
    latitude: number,
    longitude: number,
  ): Promise<ReverseGeocodeResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        String(latitude),
      )}&lon=${encodeURIComponent(String(longitude))}&addressdetails=1`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'MarvelsBasket/1.0 (hyperlocal-quick-commerce; support@marvelsbasket.com)',
          Accept: 'application/json',
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new BadGatewayException({
          code: 'REVERSE_GEOCODE_FAILED',
          message: 'Reverse geocoding service is temporarily unavailable.',
        });
      }

      const data = (await res.json()) as {
        error?: string;
        display_name?: string;
        address?: {
          suburb?: string;
          neighbourhood?: string;
          city_district?: string;
          city?: string;
          town?: string;
          village?: string;
          state_district?: string;
          state?: string;
          postcode?: string;
          road?: string;
        };
      };

      if (data.error || !data.address) {
        throw new UnprocessableEntityException({
          code: 'ADDRESS_UNRECOGNIZABLE',
          message: 'Coordinates could not be mapped to a recognizable address.',
        });
      }

      const addr = data.address;
      const locality = addr.neighbourhood || addr.suburb || addr.city_district || '';
      const street = addr.road || '';
      const city = addr.city || addr.town || addr.village || addr.state_district || '';
      const state = addr.state || '';
      const postalCode = (addr.postcode || '').replace(/\s+/g, '');

      if (!city && !locality && !postalCode) {
        throw new UnprocessableEntityException({
          code: 'ADDRESS_UNRECOGNIZABLE',
          message: 'Unable to determine city or postal code for these coordinates.',
        });
      }

      const primary =
        locality && city && locality !== city ? `${locality}, ${city}` : locality || city;
      const displayLocation =
        primary || (postalCode ? `PIN ${postalCode}` : `${city}, ${state}`.trim());

      return {
        formattedAddress: data.display_name || `${primary}, ${state} ${postalCode}`.trim(),
        displayLocation,
        locality: locality || null,
        street: street || null,
        city: city || locality,
        state,
        postalCode,
        landmark: addr.neighbourhood || addr.suburb || null,
        latitude,
        longitude,
        provider: 'nominatim',
      };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof UnprocessableEntityException || err instanceof BadGatewayException) {
        throw err;
      }
      this.logger.warn(`Nominatim reverse geocode failed: ${(err as Error).message}`);
      throw new BadGatewayException({
        code: 'REVERSE_GEOCODE_FAILED',
        message: 'Reverse geocoding request failed. Please enter or choose your location manually.',
      });
    }
  }

  /**
   * Resolves serviceability and active/nearby stores for a customer's location.
   */
  async checkServiceability(
    query: ServiceabilityQueryDto,
  ): Promise<ServiceabilityResolutionResponse> {
    const nearbyStores = await this.storesService.findNearbyStores(query);
    const activeStore = nearbyStores[0] || null;
    const isServiceable = nearbyStores.length > 0;

    const locationParts = [query.city, query.postalCode].filter(Boolean);
    const locationSummary =
      locationParts.length > 0 ? locationParts.join(' - ') : 'Selected location';

    const suggestedLocations = await this.getLocationSuggestions();

    return {
      isServiceable,
      locationSummary,
      activeStore,
      nearbyStores,
      suggestedLocations,
    };
  }

  /**
   * Searches supported hyperlocal service areas (from real approved stores and service areas).
   */
  async getLocationSuggestions(q?: string): Promise<LocationSuggestionItem[]> {
    const approvedSellers = await this.prisma.seller.findMany({
      where: {
        status: { in: [SellerStatus.APPROVED, SellerStatus.APPROVED_ACTIVE] },
        deletedAt: null,
      },
      include: {
        profile: true,
        serviceAreas: { where: { isActive: true } },
      },
    });

    const groupedByPin = new Map<
      string,
      {
        city: string;
        state: string;
        postalCode: string;
        latitude: number | null;
        longitude: number | null;
        areaHint: string;
        sellerIds: Set<string>;
      }
    >();

    for (const seller of approvedSellers) {
      const city = seller.profile?.city || 'Bengaluru';
      const state = seller.profile?.state || 'Karnataka';
      const storePin = seller.profile?.postalCode;

      const pinsToIndex: Array<{
        pin: string;
        lat: number | null;
        lng: number | null;
        areaHint: string;
      }> = [];

      if (storePin && storePin !== '000000') {
        pinsToIndex.push({
          pin: storePin,
          lat: seller.profile?.latitude ? Number(seller.profile.latitude) : null,
          lng: seller.profile?.longitude ? Number(seller.profile.longitude) : null,
          areaHint: seller.profile?.addressLine1?.split(',').slice(-1)[0]?.trim() || city,
        });
      }

      for (const sa of seller.serviceAreas) {
        if (sa.postalCode && sa.postalCode !== '000000') {
          pinsToIndex.push({
            pin: sa.postalCode,
            lat: sa.latitude
              ? Number(sa.latitude)
              : seller.profile?.latitude
                ? Number(seller.profile.latitude)
                : null,
            lng: sa.longitude
              ? Number(sa.longitude)
              : seller.profile?.longitude
                ? Number(seller.profile.longitude)
                : null,
            areaHint: city,
          });
        }
      }

      for (const entry of pinsToIndex) {
        if (!groupedByPin.has(entry.pin)) {
          groupedByPin.set(entry.pin, {
            city,
            state,
            postalCode: entry.pin,
            latitude: entry.lat,
            longitude: entry.lng,
            areaHint: entry.areaHint,
            sellerIds: new Set([seller.id]),
          });
        } else {
          groupedByPin.get(entry.pin)!.sellerIds.add(seller.id);
        }
      }
    }

    let suggestions: LocationSuggestionItem[] = Array.from(groupedByPin.values()).map((item) => {
      const displayArea =
        item.areaHint && item.areaHint.toLowerCase() !== item.city.toLowerCase()
          ? `${item.areaHint}, ${item.city}`
          : `${item.city}, ${item.postalCode}`;

      return {
        label: `${item.city} (${item.postalCode})`,
        displayLocation: displayArea,
        city: item.city,
        state: item.state,
        postalCode: item.postalCode,
        latitude: item.latitude,
        longitude: item.longitude,
        storeCount: item.sellerIds.size,
      };
    });

    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      suggestions = suggestions.filter(
        (s) =>
          s.postalCode.includes(term) ||
          s.city.toLowerCase().includes(term) ||
          s.state.toLowerCase().includes(term) ||
          s.displayLocation.toLowerCase().includes(term),
      );
    }

    return suggestions.sort((a, b) => b.storeCount - a.storeCount);
  }

  /**
   * Forward place/street/locality/PIN autocomplete search via server-side geocoding provider
   * combined with matching serviceable zones. Keeps all provider keys private on the backend.
   */
  async searchPlaces(q: string): Promise<PlaceSuggestionItem[]> {
    const clean = q?.trim();
    if (!clean || clean.length < 2) {
      return [];
    }

    const results: PlaceSuggestionItem[] = [];
    const seen = new Set<string>();

    // 1. Include matching supported serviceable hubs first so quick local matches appear immediately
    const localAreas = await this.getLocationSuggestions(clean);
    for (const area of localAreas.slice(0, 3)) {
      if (area.latitude !== null && area.longitude !== null) {
        const key = `local-${area.postalCode}`;
        seen.add(key);
        results.push({
          id: key,
          primaryText: area.displayLocation || area.city,
          secondaryText: `${area.city}, ${area.state} ${area.postalCode} (${area.storeCount} store${area.storeCount > 1 ? 's' : ''})`,
          fullAddress: `${area.displayLocation}, ${area.city}, ${area.state} ${area.postalCode}`,
          locality: area.displayLocation.split(',')[0]?.trim() || '',
          street: '',
          city: area.city,
          state: area.state,
          postalCode: area.postalCode,
          latitude: area.latitude,
          longitude: area.longitude,
          storeCount: area.storeCount,
          provider: 'service-area',
        });
      }
    }

    // 2. Query external geocoding provider (Google Maps if configured, else OpenStreetMap Nominatim)
    const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      if (googleMapsKey) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          clean,
        )}&components=country:IN&key=${encodeURIComponent(googleMapsKey)}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (res.ok) {
          const data = (await res.json()) as {
            status: string;
            results?: Array<{
              place_id: string;
              formatted_address: string;
              geometry: { location: { lat: number; lng: number } };
              address_components: Array<{ long_name: string; types: string[] }>;
            }>;
          };

          if (data.status === 'OK' && data.results) {
            for (const row of data.results.slice(0, 6)) {
              const getComp = (type: string) =>
                row.address_components.find((c) => c.types.includes(type))?.long_name || '';
              const locality =
                getComp('sublocality_level_1') || getComp('sublocality') || getComp('neighborhood');
              const street = getComp('route') || '';
              const city = getComp('locality') || getComp('administrative_area_level_2');
              const state = getComp('administrative_area_level_1');
              const postalCode = getComp('postal_code');
              const primaryText = locality || street || city || row.formatted_address;

              results.push({
                id: `google-${row.place_id}`,
                primaryText,
                secondaryText: row.formatted_address,
                fullAddress: row.formatted_address,
                locality,
                street,
                city: city || locality,
                state,
                postalCode,
                latitude: row.geometry.location.lat,
                longitude: row.geometry.location.lng,
                provider: 'google',
              });
            }
          }
        }
      } else {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&addressdetails=1&limit=6&q=${encodeURIComponent(
          clean,
        )}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'MarvelsBasket/1.0 (hyperlocal-quick-commerce; support@marvelsbasket.com)',
            Accept: 'application/json',
          },
        });
        clearTimeout(timer);

        if (res.ok) {
          const rows = (await res.json()) as Array<{
            place_id: number;
            display_name: string;
            lat: string;
            lon: string;
            name?: string;
            address?: {
              road?: string;
              suburb?: string;
              neighbourhood?: string;
              city_district?: string;
              city?: string;
              town?: string;
              village?: string;
              state_district?: string;
              state?: string;
              postcode?: string;
            };
          }>;

          for (const row of rows) {
            const lat = Number(row.lat);
            const lng = Number(row.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

            const addr = row.address || {};
            const locality = addr.neighbourhood || addr.suburb || addr.city_district || '';
            const street = addr.road || '';
            const city = addr.city || addr.town || addr.village || addr.state_district || '';
            const state = addr.state || '';
            const postalCode = (addr.postcode || '').replace(/\s+/g, '');
            const primaryText =
              row.name || locality || street || city || row.display_name.split(',')[0] || clean;
            const dedupKey = `${primaryText.toLowerCase()}-${postalCode}-${city.toLowerCase()}`;
            if (seen.has(dedupKey)) continue;
            seen.add(dedupKey);

            results.push({
              id: `nominatim-${row.place_id}`,
              primaryText,
              secondaryText: row.display_name,
              fullAddress: row.display_name,
              locality,
              street,
              city: city || locality,
              state,
              postalCode,
              latitude: lat,
              longitude: lng,
              provider: 'nominatim',
            });
          }
        }
      }
    } catch (err) {
      clearTimeout(timer);
      this.logger.warn(`Place search provider fallback: ${(err as Error).message}`);
    }

    return results.slice(0, 8);
  }
}
