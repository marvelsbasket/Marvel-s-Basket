import { apiClient } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { LocationService } from './location.service';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reverseGeocode posts coordinates to reverse-geocode endpoint', async () => {
    const payload = {
      displayLocation: 'Indiranagar, Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      formattedAddress: 'Indiranagar, Bengaluru',
      latitude: 12.9784,
      longitude: 77.6408,
      provider: 'nominatim',
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ data: payload });

    const res = await LocationService.reverseGeocode(12.9784, 77.6408);
    expect(res).toEqual(payload);
    expect(apiClient.post).toHaveBeenCalledWith(ENDPOINTS.LOCATIONS.REVERSE_GEOCODE, {
      latitude: 12.9784,
      longitude: 77.6408,
    });
  });

  it('checkServiceability queries /locations/serviceability with PIN and coords', async () => {
    const serviceability = {
      isServiceable: true,
      locationSummary: 'Bengaluru - 560038',
      activeStore: { id: 'store-1', name: 'Fresh Farms' },
      nearbyStores: [{ id: 'store-1', name: 'Fresh Farms' }],
      suggestedLocations: [],
    };
    (apiClient.get as jest.Mock).mockResolvedValue({ data: serviceability });

    const res = await LocationService.checkServiceability({
      postalCode: '560038',
      latitude: 12.9784,
      longitude: 77.6408,
    });
    expect(res.isServiceable).toBe(true);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.LOCATIONS.SERVICEABILITY, {
      params: { postalCode: '560038', latitude: 12.9784, longitude: 77.6408 },
    });
  });

  it('getStoreProducts requests store-scoped listings', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { items: [], total: 0, page: 1, limit: 24, totalPages: 1 },
    });

    await LocationService.getStoreProducts('fresh-farms-indiranagar', {
      inStockOnly: true,
      sort: 'price_asc',
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      ENDPOINTS.STORES.PRODUCTS('fresh-farms-indiranagar'),
      { params: { inStockOnly: true, sort: 'price_asc' } },
    );
  });

  it('searchPlaces queries /locations/places when query >= 2 chars', async () => {
    const places = [{ id: 'p-1', primaryText: 'Civil Lines', city: 'Azamgarh' }];
    (apiClient.get as jest.Mock).mockResolvedValue({ data: places });

    const res = await LocationService.searchPlaces('Civil Lines');
    expect(res).toEqual(places);
    expect(apiClient.get).toHaveBeenCalledWith(ENDPOINTS.LOCATIONS.PLACES, {
      params: { q: 'Civil Lines' },
    });
  });
});
