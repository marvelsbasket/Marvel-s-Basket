'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Loader2,
  MapPin,
  MapPinOff,
  Search,
  Store,
} from 'lucide-react';
import type LType from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  PlaceSuggestionItem,
  ReverseGeocodeResponse,
  ServiceabilityResolutionResponse,
} from '@marvels-basket/shared';
import { useAuth } from '@/features/auth/context/auth-context';
import { Button } from '@/components/ui/button';
import { LocationService } from '../services/location.service';

export interface SelectedMapLocation {
  latitude: number;
  longitude: number;
  displayLocation: string;
  formattedAddress: string;
  locality: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  landmark: string;
}

interface MapPickerViewProps {
  initialCoordinates: { latitude: number; longitude: number };
  initialPlace?: PlaceSuggestionItem | null;
  onBack: () => void;
  onTryAnotherLocation: () => void;
  onProceedToForm: (
    selected: SelectedMapLocation,
    serviceability: ServiceabilityResolutionResponse,
  ) => void;
  onConfirmGuestLocation: (selected: SelectedMapLocation) => Promise<void>;
}

const DEFAULT_ZOOM = 16;

export function MapPickerView({
  initialCoordinates,
  initialPlace,
  onBack,
  onTryAnotherLocation,
  onProceedToForm,
  onConfirmGuestLocation,
}: MapPickerViewProps) {
  const { isAuthenticated } = useAuth();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LType.Map | null>(null);
  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResolvedRef = useRef<{ lat: number; lng: number } | null>(null);
  const resolveSeqRef = useRef(0);
  const isResizingRef = useRef(false);

  const [centerCoords, setCenterCoords] = useState(initialCoordinates);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [isResolving, setIsResolving] = useState(true);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [resolvedGeo, setResolvedGeo] = useState<ReverseGeocodeResponse | null>(
    initialPlace
      ? {
          formattedAddress: initialPlace.fullAddress,
          displayLocation: initialPlace.primaryText,
          locality: initialPlace.locality,
          street: initialPlace.street,
          city: initialPlace.city,
          state: initialPlace.state,
          postalCode: initialPlace.postalCode,
          landmark: initialPlace.locality || null,
          latitude: initialPlace.latitude,
          longitude: initialPlace.longitude,
          provider: initialPlace.provider,
        }
      : null,
  );
  const [serviceability, setServiceability] = useState<ServiceabilityResolutionResponse | null>(
    null,
  );
  const [isApplyingGuest, setIsApplyingGuest] = useState(false);

  const resolveCoordinates = useCallback(async (lat: number, lng: number) => {
    const seq = ++resolveSeqRef.current;
    lastResolvedRef.current = { lat, lng };
    setIsResolving(true);
    setResolveError(null);
    try {
      let geo: ReverseGeocodeResponse | null = null;
      try {
        geo = await LocationService.reverseGeocode(lat, lng);
        if (seq !== resolveSeqRef.current) return;
        setResolvedGeo(geo);
      } catch (err) {
        if (seq !== resolveSeqRef.current) return;
        setResolveError(
          err instanceof Error
            ? err.message
            : 'Unable to determine street name here. Drag map or search an area.',
        );
      }

      const svc = await LocationService.checkServiceability({
        latitude: lat,
        longitude: lng,
        postalCode: geo?.postalCode || undefined,
        city: geo?.city || undefined,
      });
      if (seq !== resolveSeqRef.current) return;
      setServiceability(svc);
    } catch {
      if (seq !== resolveSeqRef.current) return;
      setResolveError('Could not verify serviceability right now. Please try again.');
      setServiceability(null);
    } finally {
      if (seq === resolveSeqRef.current) {
        setIsResolving(false);
      }
    }
  }, []);

  // Initialize Leaflet map once
  useEffect(() => {
    let isMounted = true;
    let map: LType.Map | null = null;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

      map = L.map(mapContainerRef.current, {
        center: [initialCoordinates.latitude, initialCoordinates.longitude],
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      map.on('moveend', () => {
        if (!map || isResizingRef.current) return;
        const center = map.getCenter();
        const nextLat = Math.round(center.lat * 1e6) / 1e6;
        const nextLng = Math.round(center.lng * 1e6) / 1e6;

        // Ignore micro-jitter / resize shifts within ~8m of already-resolved coordinates
        const prev = lastResolvedRef.current;
        if (
          prev &&
          Math.abs(nextLat - prev.lat) < 0.00008 &&
          Math.abs(nextLng - prev.lng) < 0.00008
        ) {
          return;
        }

        setCenterCoords({ latitude: nextLat, longitude: nextLng });

        if (resolveTimeoutRef.current) {
          clearTimeout(resolveTimeoutRef.current);
        }
        resolveTimeoutRef.current = setTimeout(() => {
          resolveCoordinates(nextLat, nextLng);
        }, 350);
      });

      mapInstanceRef.current = map;

      const safeInvalidateSize = () => {
        if (!map) return;
        isResizingRef.current = true;
        map.invalidateSize({ pan: false, animate: false });
        requestAnimationFrame(() => {
          isResizingRef.current = false;
        });
      };

      // Ensure Leaflet recalculates canvas size inside responsive portal without triggering moveend fetches
      const resizeObserver =
        typeof ResizeObserver !== 'undefined' && mapContainerRef.current
          ? new ResizeObserver(safeInvalidateSize)
          : null;
      if (resizeObserver && mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
      }
      setTimeout(safeInvalidateSize, 320);

      // Trigger initial resolution once for opening coordinates
      resolveCoordinates(initialCoordinates.latitude, initialCoordinates.longitude);

      return () => {
        resizeObserver?.disconnect();
      };
    }

    let disconnectObserver: (() => void) | undefined;
    initMap().then((cleanup) => {
      disconnectObserver = cleanup;
    });

    return () => {
      isMounted = false;
      disconnectObserver?.();
      if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current);
      if (map) {
        map.remove();
      }
      mapInstanceRef.current = null;
    };
  }, [initialCoordinates.latitude, initialCoordinates.longitude, resolveCoordinates]);

  // Debounced place autocomplete on map view
  useEffect(() => {
    const clean = searchQuery.trim();
    if (clean.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await LocationService.searchPlaces(clean);
        if (!cancelled) setSearchResults(res);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleSelectPlace = (place: PlaceSuggestionItem) => {
    setShowDropdown(false);
    setSearchQuery(place.primaryText);
    setGeoError(null);
    setResolvedGeo({
      formattedAddress: place.fullAddress,
      displayLocation: place.primaryText,
      locality: place.locality,
      street: place.street,
      city: place.city,
      state: place.state,
      postalCode: place.postalCode,
      landmark: place.locality || null,
      latitude: place.latitude,
      longitude: place.longitude,
      provider: place.provider,
    });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([place.latitude, place.longitude], DEFAULT_ZOOM, {
        animate: true,
        duration: 0.75,
      });
    } else {
      resolveCoordinates(place.latitude, place.longitude);
    }
  };

  const handleReturnToCurrentLocation = () => {
    setGeoError(null);
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoError('Browser geolocation is unavailable. Search or drag the map instead.');
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setGeoError('GPS detection requires HTTPS or localhost. Search your area above.');
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], DEFAULT_ZOOM, {
            animate: true,
            duration: 0.8,
          });
        } else {
          resolveCoordinates(latitude, longitude);
        }
      },
      (err) => {
        setIsLocatingGps(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Location permission denied. Drag the map or search an area above.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError('GPS signal unavailable. Please drag the map pin manually.');
            break;
          case err.TIMEOUT:
            setGeoError('GPS lookup timed out. Please retry or use search.');
            break;
          default:
            setGeoError('Unable to fetch GPS position.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
    );
  };

  const buildSelectedPayload = (): SelectedMapLocation => ({
    latitude: centerCoords.latitude,
    longitude: centerCoords.longitude,
    displayLocation:
      resolvedGeo?.displayLocation ||
      (resolvedGeo?.city ? `${resolvedGeo.city}, ${resolvedGeo.state}` : 'Selected Location'),
    formattedAddress: resolvedGeo?.formattedAddress || '',
    locality: resolvedGeo?.locality || '',
    street: resolvedGeo?.street || '',
    city: resolvedGeo?.city || '',
    state: resolvedGeo?.state || '',
    postalCode: resolvedGeo?.postalCode || '',
    landmark: resolvedGeo?.landmark || '',
  });

  const isServiceable = Boolean(serviceability?.isServiceable && serviceability.activeStore);
  const canProceed = !isResolving && Boolean(serviceability) && isServiceable;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Top Bar: Back + Search for an area, street or landmark */}
      <div className="relative z-30 shrink-0 border-b border-border bg-white px-3.5 py-2.5 sm:px-4 sm:py-3 space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to location options"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink hover:bg-surface shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              placeholder="Search for an area, street or landmark"
              aria-label="Search for an area, street or landmark"
              className="h-10 w-full rounded-xl border border-border bg-surface-tile pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:bg-white focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {/* Autocomplete Dropdown inside Map View */}
        {showDropdown && searchQuery.trim().length >= 2 && (
          <div className="absolute left-4 right-4 top-[58px] z-40 max-h-56 overflow-y-auto rounded-xl border border-border bg-white shadow-xl divide-y divide-border-subtle">
            {isSearching ? (
              <div className="p-3 text-xs text-muted flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                Searching places...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-3 text-xs text-muted">
                No matching places found for &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              searchResults.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-surface transition-colors"
                >
                  <MapPin className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">{place.primaryText}</p>
                    <p className="text-[11px] text-muted truncate">{place.secondaryText}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {geoError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{geoError}</span>
          </div>
        )}
      </div>

      {/* Interactive Map Viewport with Fixed Center Pin */}
      <div className="relative flex-1 min-h-[160px] bg-stone-100 overflow-hidden">
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Fixed Center Pin Overlay (map moves underneath!) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center"
        >
          <div className="flex flex-col items-center -translate-y-6">
            <div className="mb-1.5 rounded-full bg-ink/90 px-3 py-1 text-[11px] font-semibold text-white shadow-md whitespace-nowrap">
              Drag the map to adjust location
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-4 ring-white">
              <MapPin className="h-5 w-5 fill-white text-brand" />
            </div>
            <div className="mt-0.5 h-2 w-2 rounded-full bg-black/35 blur-[1px]" />
          </div>
        </div>

        {/* Floating Current Location Button */}
        <div className="absolute bottom-4 right-4 z-[500]">
          <button
            type="button"
            onClick={handleReturnToCurrentLocation}
            disabled={isLocatingGps}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2 text-xs font-bold text-brand shadow-lg hover:bg-brand-tint transition-colors disabled:opacity-60"
          >
            {isLocatingGps ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            <span>Current Location</span>
          </button>
        </div>
      </div>

      {/* Bottom Serviceability & Summary Area */}
      <div className="shrink-0 max-h-[46%] overflow-y-auto border-t border-border bg-white p-3.5 sm:p-4 space-y-2.5">
        {isResolving ? (
          <div className="flex items-center justify-center gap-2.5 py-5 text-sm font-medium text-ink-secondary">
            <Loader2 className="h-4 w-4 animate-spin text-brand" />
            <span>Checking store availability &amp; resolving address...</span>
          </div>
        ) : serviceability && !isServiceable ? (
          /* Unserviceable State per Section 4.1 */
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <MapPinOff className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-ink">
                Marvel&apos;s Basket isn&apos;t available here
              </h3>
              <p className="text-xs text-amber-900/80 mt-1">
                We&apos;re expanding our services and hope to reach you soon 😊
              </p>
            </div>
            <Button
              type="button"
              onClick={onTryAnotherLocation}
              className="w-full sm:w-auto bg-brand hover:bg-forest text-white font-bold"
            >
              Try Another Location
            </Button>
          </div>
        ) : (
          /* Serviceable Summary per Section 4.2 */
          <div className="space-y-3">
            {resolveError && <p className="text-xs text-amber-700 font-medium">{resolveError}</p>}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Delivering to
                </span>
                <p className="text-sm font-extrabold text-ink mt-0.5 truncate">
                  {resolvedGeo?.displayLocation || 'Selected Neighborhood'}
                </p>
                <p className="text-xs text-muted line-clamp-2 mt-0.5">
                  {resolvedGeo?.formattedAddress ||
                    `Lat ${centerCoords.latitude.toFixed(4)}, Lng ${centerCoords.longitude.toFixed(4)}`}
                </p>
                {serviceability?.activeStore && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                    <Store className="h-3 w-3" />
                    <span>
                      {serviceability.activeStore.name}
                      {serviceability.activeStore.deliveryEtaLabel
                        ? ` • ${serviceability.activeStore.deliveryEtaLabel}`
                        : ''}
                    </span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onTryAnotherLocation}
                className="text-xs font-bold text-brand hover:underline shrink-0 pt-1"
              >
                Change
              </button>
            </div>

            {isAuthenticated ? (
              <Button
                type="button"
                disabled={!canProceed}
                onClick={() => {
                  if (serviceability && canProceed) {
                    onProceedToForm(buildSelectedPayload(), serviceability);
                  }
                }}
                className="w-full py-3.5 rounded-xl bg-brand hover:bg-forest text-white font-bold"
              >
                <span>Complete Address Details</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  disabled={!canProceed}
                  isLoading={isApplyingGuest}
                  onClick={async () => {
                    if (!canProceed) return;
                    setIsApplyingGuest(true);
                    try {
                      await onConfirmGuestLocation(buildSelectedPayload());
                    } finally {
                      setIsApplyingGuest(false);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-brand hover:bg-forest text-white font-bold"
                >
                  Confirm Delivery Location
                </Button>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-ink hover:bg-surface"
                >
                  Sign In to Save Address
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
