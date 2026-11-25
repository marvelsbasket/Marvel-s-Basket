'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Crosshair,
  Home,
  Loader2,
  MapPin,
  MapPinOff,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { CustomerAddressResponse, PlaceSuggestionItem } from '@marvels-basket/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/context/auth-context';
import { addressService } from '@/features/addresses/services/address.service';
import { useBasket } from '@/features/basket/context/basket-context';
import { LocationService } from '../services/location.service';
import { toDeliveryLocationFromAddress, useLocation } from '../context/location-context';
import { MapPickerView, SelectedMapLocation } from './map-picker-view';
import { AddressDetailsForm, AddressFormDraft } from './address-details-form';

type PopupStep = 'initial' | 'map' | 'form' | 'success';

const FALLBACK_COORDS = { latitude: 12.9784, longitude: 77.6408 };

export function LocationSelectorModal() {
  const { isAuthenticated } = useAuth();
  const {
    isLocationModalOpen,
    locationModalOptions,
    closeLocationModal,
    location,
    isServiceable,
    isResolving,
    savedAddresses,
    suggestedLocations,
    refreshSavedAddresses,
  } = useLocation();
  const { requestLocationSwitch, notify } = useBasket();

  const flowMode = locationModalOptions?.mode || 'navbar';
  const editingAddress = locationModalOptions?.editingAddress || null;
  const isProfileAdd = flowMode === 'profile-add';
  const isProfileEdit = flowMode === 'profile-edit' && Boolean(editingAddress);

  const [step, setStep] = useState<PopupStep>('initial');
  const [searchQuery, setSearchQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceSuggestionItem[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [mapInitCoords, setMapInitCoords] = useState(FALLBACK_COORDS);
  const [mapInitPlace, setMapInitPlace] = useState<PlaceSuggestionItem | null>(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState<SelectedMapLocation | null>(null);
  const [formDraft, setFormDraft] = useState<AddressFormDraft | null>(null);

  // Reset or seed modal state whenever opened & lock background scroll
  useEffect(() => {
    if (isLocationModalOpen) {
      setSearchQuery('');
      setPlaceResults([]);
      setGeoError(null);
      setIsDetectingGps(false);
      setFormDraft(null);
      document.body.style.overflow = 'hidden';

      if (isProfileEdit && editingAddress) {
        const lat = editingAddress.latitude ?? location?.latitude ?? FALLBACK_COORDS.latitude;
        const lng = editingAddress.longitude ?? location?.longitude ?? FALLBACK_COORDS.longitude;
        setMapInitCoords({ latitude: lat, longitude: lng });
        setSelectedMapLocation({
          latitude: lat,
          longitude: lng,
          displayLocation: editingAddress.locality
            ? `${editingAddress.locality}, ${editingAddress.city}`
            : `${editingAddress.city}, ${editingAddress.state}`,
          formattedAddress: [
            editingAddress.addressLine1,
            editingAddress.addressLine2,
            editingAddress.locality,
            editingAddress.city,
            editingAddress.state,
            editingAddress.postalCode,
          ]
            .filter(Boolean)
            .join(', '),
          locality: editingAddress.locality || '',
          street: editingAddress.addressLine2 || '',
          city: editingAddress.city,
          state: editingAddress.state,
          postalCode: editingAddress.postalCode,
          landmark: editingAddress.landmark || '',
        });
        setStep('form');
      } else {
        setSelectedMapLocation(null);
        setStep('initial');
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLocationModalOpen) {
        closeLocationModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    isLocationModalOpen,
    isProfileEdit,
    editingAddress,
    location?.latitude,
    location?.longitude,
    closeLocationModal,
  ]);

  // Debounced place search on initial popup
  useEffect(() => {
    if (!isLocationModalOpen || step !== 'initial') return;
    const clean = searchQuery.trim();
    if (clean.length < 2) {
      setPlaceResults([]);
      setIsSearchingPlaces(false);
      return;
    }

    let cancelled = false;
    setIsSearchingPlaces(true);
    const timer = setTimeout(async () => {
      try {
        const res = await LocationService.searchPlaces(clean);
        if (!cancelled) setPlaceResults(res);
      } catch {
        if (!cancelled) setPlaceResults([]);
      } finally {
        if (!cancelled) setIsSearchingPlaces(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isLocationModalOpen, step]);

  // Sort saved addresses: selected/default first, then remaining addresses
  const orderedSavedAddresses = useMemo(() => {
    if (!savedAddresses || savedAddresses.length === 0) return [];
    const activeId = location?.addressId;
    return [...savedAddresses].sort((a, b) => {
      const aSelected = activeId ? a.id === activeId : a.isDefault;
      const bSelected = activeId ? b.id === activeId : b.isDefault;
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return 0;
    });
  }, [savedAddresses, location?.addressId]);

  const handleSelectSavedAddress = async (addr: CustomerAddressResponse) => {
    const targetLoc = toDeliveryLocationFromAddress(addr);
    const switched = await requestLocationSwitch(targetLoc);

    if (switched && isAuthenticated && !addr.isDefault) {
      try {
        await addressService.setDefault(addr.id);
        await refreshSavedAddresses();
      } catch {
        // Non-fatal
      }
    }
    closeLocationModal();
  };

  const handleUseCurrentLocation = () => {
    setGeoError(null);

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoError(
        'Your browser does not support automatic location detection. Search your area or use the map directly.',
      );
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setGeoError('Location detection requires HTTPS or localhost.');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetectingGps(false);
        setMapInitPlace(null);
        setMapInitCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStep('map');
      },
      (error) => {
        setIsDetectingGps(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError(
              'Location permission denied. Please enable permission in browser settings or search your area below.',
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('GPS signal is currently unavailable. Please search manually.');
            break;
          case error.TIMEOUT:
            setGeoError('Location detection timed out. Please retry or search an area.');
            break;
          default:
            setGeoError('Unable to detect current location. Search your area instead.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  const handleOpenMapForNewAddress = () => {
    setGeoError(null);
    setMapInitPlace(null);
    if (location?.latitude && location?.longitude) {
      setMapInitCoords({ latitude: location.latitude, longitude: location.longitude });
    } else if (suggestedLocations[0]?.latitude && suggestedLocations[0]?.longitude) {
      setMapInitCoords({
        latitude: suggestedLocations[0].latitude,
        longitude: suggestedLocations[0].longitude,
      });
    } else {
      setMapInitCoords(FALLBACK_COORDS);
    }
    setStep('map');
  };

  const getAddressIcon = (addr: CustomerAddressResponse) => {
    const t = addr.addressType || addr.label.toUpperCase();
    if (t === 'HOME') return Home;
    if (t === 'OFFICE' || t === 'WORK') return Briefcase;
    return MapPin;
  };

  if (!isLocationModalOpen) return null;

  const isExpandedMobile = step === 'map' || step === 'form';

  const renderSearchSection = () => (
    <div className="space-y-2">
      <label
        htmlFor="location-popup-search"
        className="block text-xs font-extrabold uppercase tracking-wider text-ink-secondary"
      >
        Search for your location
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          id="location-popup-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search area, street, landmark or PIN code"
          className="h-11 w-full rounded-xl border border-border bg-surface-tile pl-10 pr-9 text-sm text-ink placeholder:text-muted focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear location search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Live Search Suggestions */}
      {searchQuery.trim().length >= 2 && (
        <div className="rounded-xl border border-border bg-white shadow-sm divide-y divide-border-subtle max-h-52 overflow-y-auto">
          {isSearchingPlaces ? (
            <div className="flex items-center gap-2 p-3 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
              <span>Searching locations...</span>
            </div>
          ) : placeResults.length === 0 ? (
            <div className="p-3 text-xs text-muted">
              No locations found matching &ldquo;{searchQuery}&rdquo;. Try another street, locality,
              or 6-digit PIN code.
            </div>
          ) : (
            placeResults.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  setMapInitPlace(place);
                  setMapInitCoords({
                    latitude: place.latitude,
                    longitude: place.longitude,
                  });
                  setStep('map');
                }}
                className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left hover:bg-surface transition-colors"
              >
                <MapPin className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink truncate">{place.primaryText}</p>
                  <p className="text-[11px] text-muted truncate">{place.secondaryText}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );

  const renderUseCurrentLocation = () => (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={isDetectingGps}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand/25 bg-brand-tint/50 p-3.5 text-left hover:bg-brand-tint transition-colors disabled:opacity-60"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand shadow-2xs shrink-0">
            {isDetectingGps ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Crosshair className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-extrabold text-brand">Use Current Location</p>
            <p className="text-xs text-ink-secondary">
              {isProfileAdd
                ? 'Detect your current location automatically.'
                : 'Automatically detect your current location'}
            </p>
          </div>
        </div>
      </button>

      {geoError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{geoError}</span>
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={closeLocationModal}
      className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:inset-0 z-50 flex items-end sm:items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isProfileAdd ? 'Add New Delivery Address' : 'Select Delivery Location'}
    >
      {/* Blurred backdrop above bottom tabs; clicking anywhere outside closes popup */}
      <div
        className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:inset-0 bg-black/40 backdrop-blur-sm animate-mb-backdrop"
        aria-hidden="true"
      />

      {/* Bottom-up popup: blows up from bottom, grows upward smoothly when map/form opens */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full origin-bottom bg-white shadow-2xl overflow-hidden rounded-2xl border border-border/60 flex flex-col animate-mb-sheet-up transition-[height,max-height] duration-300 ease-out sm:max-w-lg ${
          isExpandedMobile
            ? 'h-[94%] max-h-full sm:h-[620px] sm:max-h-[88vh]'
            : 'h-[72%] max-h-[82%] sm:h-auto sm:max-h-[88vh]'
        }`}
      >
        {/* Top Spacing inside Initial Popup */}
        {step === 'initial' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div>
                <h2 className="text-base font-extrabold text-ink">
                  {isProfileAdd ? 'Add New Delivery Address' : 'Select Delivery Location'}
                </h2>
                <p className="text-xs text-muted">
                  {isProfileAdd
                    ? 'Detect your current location or search an area to drop your pin'
                    : 'Choose where you want your groceries delivered'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLocationModal}
                aria-label="Close location popup"
                className="rounded-full p-1.5 text-muted hover:bg-surface hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Unserviceable alert banner inside Navbar Location mode */}
              {!isProfileAdd && location && !isServiceable && !isResolving && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-2.5">
                  <MapPinOff className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <p className="font-bold">Marvel&apos;s Basket isn&apos;t available here</p>
                    <p className="mt-0.5">
                      No partner store currently serves <strong>{location.displayLocation}</strong>.
                      Search another area or pick a saved address below.
                    </p>
                  </div>
                </div>
              )}

              {isProfileAdd ? (
                <>
                  {/* Option A — Use Current Location */}
                  {renderUseCurrentLocation()}
                  {/* Option B — Search for Location */}
                  {renderSearchSection()}
                </>
              ) : (
                <>
                  {/* Navbar Order: 1. Search -> 2. Use Current Location -> 3. Saved Addresses */}
                  {renderSearchSection()}
                  {renderUseCurrentLocation()}

                  <div className="space-y-3 pt-1 border-t border-border-subtle">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink-secondary">
                        Saved Addresses
                      </h3>
                      <button
                        type="button"
                        onClick={handleOpenMapForNewAddress}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-brand hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>ADD NEW ADDRESS</span>
                      </button>
                    </div>

                    {!isAuthenticated ? (
                      <div className="rounded-xl border border-dashed border-border bg-surface/60 p-4 text-center space-y-2">
                        <p className="text-xs text-muted">
                          Sign in to access your saved delivery addresses across devices.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenMapForNewAddress}
                          className="text-xs font-bold text-brand hover:underline"
                        >
                          Or pin a location on the map →
                        </button>
                      </div>
                    ) : orderedSavedAddresses.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-surface/60 p-4 text-center space-y-2">
                        <p className="text-xs text-muted">
                          No saved addresses yet. Drop a pin on the map to add your first address.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleOpenMapForNewAddress}
                          className="border-brand/30 text-brand hover:bg-brand-tint"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add New Address
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {orderedSavedAddresses.map((addr) => {
                          const isSelected = location?.addressId
                            ? location.addressId === addr.id
                            : addr.isDefault;
                          const Icon = getAddressIcon(addr);

                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => handleSelectSavedAddress(addr)}
                              className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                                isSelected
                                  ? 'border-brand bg-brand-tint/40 ring-1 ring-brand shadow-2xs'
                                  : 'border-border bg-white hover:border-brand/40 hover:bg-surface/40'
                              }`}
                            >
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                                  isSelected
                                    ? 'bg-brand text-white'
                                    : 'bg-surface text-ink-secondary'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-extrabold text-ink">
                                    {addr.label}
                                  </span>
                                  {isSelected && (
                                    <Badge variant="success" className="text-[10px] py-0 px-1.5">
                                      Selected
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-ink-secondary mt-0.5">
                                  {addr.recipientName}
                                </p>
                                <p className="text-xs text-muted mt-0.5 line-clamp-2">
                                  {[
                                    addr.addressLine1,
                                    addr.addressLine2,
                                    addr.locality,
                                    addr.city,
                                    addr.state,
                                  ]
                                    .filter(Boolean)
                                    .join(', ')}{' '}
                                  — {addr.postalCode}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* VIEW 2: MAP SELECTION VIEW                                      */}
        {/* =============================================================== */}
        {step === 'map' && (
          <MapPickerView
            initialCoordinates={mapInitCoords}
            initialPlace={mapInitPlace}
            onBack={() => setStep(isProfileEdit && selectedMapLocation ? 'form' : 'initial')}
            onTryAnotherLocation={() => {
              setSearchQuery('');
              setPlaceResults([]);
              setGeoError(null);
              setStep('initial');
            }}
            onProceedToForm={(picked) => {
              setSelectedMapLocation(picked);
              setMapInitCoords({ latitude: picked.latitude, longitude: picked.longitude });
              setStep('form');
            }}
            onConfirmGuestLocation={async (picked) => {
              await requestLocationSwitch({
                displayLocation: picked.displayLocation,
                fullAddress: picked.formattedAddress,
                city: picked.city,
                state: picked.state,
                postalCode: picked.postalCode,
                latitude: picked.latitude,
                longitude: picked.longitude,
                source: 'CURRENT_LOCATION',
              });
              notify('Your delivery location has been updated.', 'success');
              closeLocationModal();
            }}
          />
        )}

        {/* =============================================================== */}
        {/* VIEW 3: COMPLETE ADDRESS DETAILS FORM                           */}
        {/* =============================================================== */}
        {step === 'form' && selectedMapLocation && (
          <AddressDetailsForm
            selectedLocation={selectedMapLocation}
            editingAddress={isProfileEdit ? editingAddress : null}
            draft={formDraft}
            onDraftChange={setFormDraft}
            onChangeMapLocation={() => {
              setMapInitPlace(null);
              setMapInitCoords({
                latitude: selectedMapLocation.latitude,
                longitude: selectedMapLocation.longitude,
              });
              setStep('map');
            }}
            onBack={() => (isProfileEdit ? closeLocationModal() : setStep('map'))}
            onAddressConfirmed={async (saved) => {
              if (saved.isDefault || saved.id === location?.addressId) {
                const nextLoc = toDeliveryLocationFromAddress(saved);
                await requestLocationSwitch(nextLoc);
              }
              await refreshSavedAddresses();
              await locationModalOptions?.onSavedAddress?.(saved);
              setStep('success');
              setTimeout(() => {
                closeLocationModal();
              }, 1100);
            }}
          />
        )}

        {/* =============================================================== */}
        {/* VIEW 4: SUCCESS CONFIRMATION                                    */}
        {/* =============================================================== */}
        {step === 'success' && (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-brand">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-extrabold text-ink">
              {isProfileEdit ? 'Address updated successfully!' : 'Address saved successfully!'}
            </h2>
            <p className="text-sm text-muted">Your delivery location has been updated.</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
