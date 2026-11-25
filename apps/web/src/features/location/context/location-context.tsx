'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  CustomerAddressResponse,
  DeliveryLocation,
  LocationSuggestionItem,
  PublicStoreItem,
  ServiceabilityResolutionResponse,
} from '@marvels-basket/shared';
import { useAuth } from '@/features/auth/context/auth-context';
import { addressService } from '@/features/addresses/services/address.service';
import { LocationService } from '../services/location.service';

const LOCATION_STORAGE_KEY = 'mb_delivery_location_v1';

interface PersistedLocationPayload {
  location: DeliveryLocation;
  preferredStoreId?: string | null;
}

export interface LocationModalOptions {
  mode?: 'navbar' | 'profile-add' | 'profile-edit';
  editingAddress?: CustomerAddressResponse | null;
  onSavedAddress?: (address: CustomerAddressResponse) => void | Promise<void>;
}

export function toDeliveryLocationFromAddress(addr: CustomerAddressResponse): DeliveryLocation {
  const displayArea = addr.locality
    ? `${addr.locality}, ${addr.city}`
    : `${addr.city}, ${addr.state}`;

  return {
    addressId: addr.id,
    label: addr.label,
    displayLocation: displayArea,
    fullAddress: [
      addr.addressLine1,
      addr.addressLine2,
      addr.locality,
      addr.city,
      addr.state,
      addr.postalCode,
    ]
      .filter(Boolean)
      .join(', '),
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    latitude: addr.latitude ?? null,
    longitude: addr.longitude ?? null,
    source: 'SAVED_ADDRESS',
  };
}

export interface LocationContextValue {
  isHydrated: boolean;
  isResolving: boolean;
  location: DeliveryLocation | null;
  hasLocationContext: boolean;
  serviceability: ServiceabilityResolutionResponse | null;
  isServiceable: boolean;
  activeStore: PublicStoreItem | null;
  nearbyStores: PublicStoreItem[];
  savedAddresses: CustomerAddressResponse[];
  suggestedLocations: LocationSuggestionItem[];
  isLocationModalOpen: boolean;
  locationModalOptions: LocationModalOptions | null;
  openLocationModal: () => void;
  openAddressFlow: (options?: LocationModalOptions) => void;
  closeLocationModal: () => void;
  applyLocationDirect: (
    nextLocation: DeliveryLocation,
    preferredStoreId?: string | null,
  ) => Promise<ServiceabilityResolutionResponse | null>;
  selectPreferredStore: (store: PublicStoreItem) => void;
  clearLocation: () => void;
  refreshSavedAddresses: () => Promise<CustomerAddressResponse[]>;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [isHydrated, setIsHydrated] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [location, setLocation] = useState<DeliveryLocation | null>(null);
  const [serviceability, setServiceability] = useState<ServiceabilityResolutionResponse | null>(
    null,
  );
  const [activeStore, setActiveStore] = useState<PublicStoreItem | null>(null);
  const [nearbyStores, setNearbyStores] = useState<PublicStoreItem[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddressResponse[]>([]);
  const [suggestedLocations, setSuggestedLocations] = useState<LocationSuggestionItem[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationModalOptions, setLocationModalOptions] = useState<LocationModalOptions | null>(
    null,
  );

  const persistLocation = useCallback(
    (loc: DeliveryLocation | null, preferredStoreId?: string | null) => {
      if (typeof window === 'undefined') return;
      if (!loc) {
        localStorage.removeItem(LOCATION_STORAGE_KEY);
        return;
      }
      const payload: PersistedLocationPayload = {
        location: loc,
        preferredStoreId: preferredStoreId ?? null,
      };
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(payload));
    },
    [],
  );

  const applyLocationDirect = useCallback(
    async (
      nextLocation: DeliveryLocation,
      preferredStoreId?: string | null,
    ): Promise<ServiceabilityResolutionResponse | null> => {
      try {
        setIsResolving(true);
        const res = await LocationService.checkServiceability({
          postalCode: nextLocation.postalCode ?? undefined,
          latitude: nextLocation.latitude ?? undefined,
          longitude: nextLocation.longitude ?? undefined,
          city: nextLocation.city,
        });

        let chosenStore = res.activeStore;
        if (preferredStoreId && res.nearbyStores.length > 0) {
          const matched = res.nearbyStores.find((s) => s.id === preferredStoreId);
          if (matched) {
            chosenStore = matched;
          }
        }

        setLocation(nextLocation);
        setServiceability(res);
        setNearbyStores(res.nearbyStores);
        setActiveStore(chosenStore);
        if (res.suggestedLocations?.length) {
          setSuggestedLocations(res.suggestedLocations);
        }
        persistLocation(nextLocation, chosenStore?.id ?? null);
        return res;
      } catch {
        setLocation(nextLocation);
        setServiceability(null);
        setNearbyStores([]);
        setActiveStore(null);
        persistLocation(nextLocation, null);
        return null;
      } finally {
        setIsResolving(false);
      }
    },
    [persistLocation],
  );

  const selectPreferredStore = useCallback(
    (store: PublicStoreItem) => {
      setActiveStore(store);
      if (location) {
        persistLocation(location, store.id);
      }
    },
    [location, persistLocation],
  );

  const clearLocation = useCallback(() => {
    setLocation(null);
    setServiceability(null);
    setActiveStore(null);
    setNearbyStores([]);
    persistLocation(null);
  }, [persistLocation]);

  const refreshSavedAddresses = useCallback(async (): Promise<CustomerAddressResponse[]> => {
    if (!isAuthenticated) {
      setSavedAddresses([]);
      return [];
    }
    try {
      const addresses = await addressService.list();
      const next = addresses || [];
      setSavedAddresses(next);
      return next;
    } catch {
      setSavedAddresses([]);
      return [];
    }
  }, [isAuthenticated]);

  // Hydrate persisted location + public service area suggestions on client mount
  useEffect(() => {
    let active = true;

    async function hydrate() {
      let parsed: PersistedLocationPayload | null = null;
      try {
        const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (raw) {
          parsed = JSON.parse(raw) as PersistedLocationPayload;
        }
      } catch {
        parsed = null;
      }

      if (parsed?.location) {
        await applyLocationDirect(parsed.location, parsed.preferredStoreId);
      } else {
        try {
          const suggestions = await LocationService.getLocationSuggestions();
          if (active) setSuggestedLocations(suggestions);
        } catch {
          // Non-fatal
        }
      }

      if (active) {
        setIsHydrated(true);
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, [applyLocationDirect]);

  // Load saved addresses for logged-in user and default location if none selected yet
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setSavedAddresses([]);
      return;
    }

    let cancelled = false;
    async function loadUserAddresses() {
      try {
        const addresses = await addressService.list();
        if (cancelled) return;
        setSavedAddresses(addresses || []);

        const hasStored =
          typeof window !== 'undefined' && Boolean(localStorage.getItem(LOCATION_STORAGE_KEY));

        if (!hasStored && addresses && addresses.length > 0) {
          const def = addresses.find((a) => a.isDefault);
          if (def) {
            await applyLocationDirect(toDeliveryLocationFromAddress(def));
          }
        }
      } catch {
        if (!cancelled) setSavedAddresses([]);
      }
    }

    loadUserAddresses();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading, applyLocationDirect]);

  const value: LocationContextValue = {
    isHydrated,
    isResolving,
    location,
    hasLocationContext: Boolean(location),
    serviceability,
    isServiceable: Boolean(location && serviceability?.isServiceable && activeStore),
    activeStore,
    nearbyStores,
    savedAddresses,
    suggestedLocations,
    isLocationModalOpen,
    locationModalOptions,
    openLocationModal: () => {
      setLocationModalOptions({ mode: 'navbar' });
      setIsLocationModalOpen(true);
    },
    openAddressFlow: (options?: LocationModalOptions) => {
      setLocationModalOptions(options ?? { mode: 'profile-add' });
      setIsLocationModalOpen(true);
    },
    closeLocationModal: () => {
      setIsLocationModalOpen(false);
      setLocationModalOptions(null);
    },
    applyLocationDirect,
    selectPreferredStore,
    clearLocation,
    refreshSavedAddresses,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return ctx;
}
