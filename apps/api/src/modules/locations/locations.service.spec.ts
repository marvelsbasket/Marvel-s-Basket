import { BadGatewayException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SellerStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StoresService } from '../stores/stores.service';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  let service: LocationsService;
  const originalFetch = global.fetch;
  const originalGoogleKey = process.env.GOOGLE_MAPS_API_KEY;

  const mockPrisma = {
    seller: {
      findMany: jest.fn(),
    },
  };

  const mockStoresService = {
    findNearbyStores: jest.fn(),
  };

  beforeEach(async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StoresService, useValue: mockStoresService },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalGoogleKey !== undefined) {
      process.env.GOOGLE_MAPS_API_KEY = originalGoogleKey;
    } else {
      delete process.env.GOOGLE_MAPS_API_KEY;
    }
  });

  describe('reverseGeocode', () => {
    it('maps Nominatim response cleanly to structured ReverseGeocodeResponse', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          display_name: '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038, India',
          address: {
            road: '100 Feet Road',
            suburb: 'Indiranagar',
            city: 'Bengaluru',
            state: 'Karnataka',
            postcode: '560038',
          },
        }),
      }) as unknown as typeof fetch;

      const result = await service.reverseGeocode({ latitude: 12.9784, longitude: 77.6408 });
      expect(result.postalCode).toBe('560038');
      expect(result.city).toBe('Bengaluru');
      expect(result.locality).toBe('Indiranagar');
      expect(result.street).toBe('100 Feet Road');
      expect(result.displayLocation).toBe('Indiranagar, Bengaluru');
      expect(result.provider).toBe('nominatim');
    });

    it('throws UnprocessableEntityException when coordinates have no recognizable address', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'Unable to geocode' }),
      }) as unknown as typeof fetch;

      await expect(service.reverseGeocode({ latitude: 0, longitude: 0 })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws BadGatewayException when geocoder network fails', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('Network timeout')) as unknown as typeof fetch;

      await expect(service.reverseGeocode({ latitude: 12.97, longitude: 77.64 })).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('checkServiceability', () => {
    it('returns isServiceable=false and no activeStore when no nearby stores match', async () => {
      mockStoresService.findNearbyStores.mockResolvedValue([]);
      mockPrisma.seller.findMany.mockResolvedValue([
        {
          id: 's-1',
          status: SellerStatus.APPROVED,
          profile: {
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560038',
            latitude: 12.9784,
            longitude: 77.6408,
          },
          serviceAreas: [{ postalCode: '560038', latitude: null, longitude: null, isActive: true }],
        },
      ]);

      const result = await service.checkServiceability({ postalCode: '999999' });
      expect(result.isServiceable).toBe(false);
      expect(result.activeStore).toBeNull();
      expect(result.nearbyStores).toEqual([]);
      expect(result.suggestedLocations.length).toBeGreaterThan(0);
    });
  });

  describe('searchPlaces', () => {
    it('returns local serviceable areas merged with geocoding search results', async () => {
      mockPrisma.seller.findMany.mockResolvedValue([
        {
          id: 's-1',
          status: SellerStatus.APPROVED,
          profile: {
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560038',
            addressLine1: '100 Feet Road, Indiranagar',
            latitude: 12.9784,
            longitude: 77.6408,
          },
          serviceAreas: [{ postalCode: '560038', latitude: null, longitude: null, isActive: true }],
        },
      ]);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            place_id: 101,
            display_name: 'Civil Lines, Azamgarh, Uttar Pradesh, India',
            lat: '26.0688',
            lon: '83.1859',
            name: 'Civil Lines',
            address: {
              suburb: 'Civil Lines',
              city: 'Azamgarh',
              state: 'Uttar Pradesh',
              postcode: '276001',
            },
          },
        ],
      }) as unknown as typeof fetch;

      const places = await service.searchPlaces('Bengaluru');
      expect(places.length).toBeGreaterThanOrEqual(2);
      expect(places.some((p) => p.postalCode === '560038')).toBe(true);
    });
  });
});
