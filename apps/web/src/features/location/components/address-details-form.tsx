'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Home,
  MapPin,
  Phone,
  User,
  Users,
} from 'lucide-react';
import { AddressType, CustomerAddressResponse } from '@marvels-basket/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/context/auth-context';
import { addressService } from '@/features/addresses/services/address.service';
import { LocationService } from '../services/location.service';
import type { SelectedMapLocation } from './map-picker-view';

export interface AddressFormDraft {
  forSomeoneElse: boolean;
  addressType: AddressType;
  customLabel: string;
  houseNo: string;
  streetName: string;
  landmark: string;
  locality: string;
  city: string;
  stateName: string;
  postalCode: string;
  fullName: string;
  phone: string;
  isDefault: boolean;
}

interface AddressDetailsFormProps {
  selectedLocation: SelectedMapLocation;
  editingAddress?: CustomerAddressResponse | null;
  draft?: AddressFormDraft | null;
  onDraftChange?: (draft: AddressFormDraft) => void;
  onChangeMapLocation: () => void;
  onBack: () => void;
  onAddressConfirmed: (savedAddress: CustomerAddressResponse) => Promise<void>;
}

function normalizePhoneDigits(raw?: string | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits.slice(-10);
}

function inferAddressType(addr?: CustomerAddressResponse | null): AddressType {
  if (addr?.addressType) return addr.addressType;
  const lbl = (addr?.label || '').trim().toLowerCase();
  if (lbl === 'home') return 'HOME';
  if (lbl === 'office' || lbl === 'work') return 'OFFICE';
  return lbl ? 'OTHER' : 'HOME';
}

export function AddressDetailsForm({
  selectedLocation,
  editingAddress,
  draft,
  onDraftChange,
  onChangeMapLocation,
  onBack,
  onAddressConfirmed,
}: AddressDetailsFormProps) {
  const { user } = useAuth();
  const isEditing = Boolean(editingAddress);

  const initialType = draft?.addressType ?? inferAddressType(editingAddress);
  const initialCustomLabel =
    draft?.customLabel ??
    (editingAddress &&
    !['home', 'office', 'work', 'other', 'others'].includes(
      editingAddress.label.trim().toLowerCase(),
    )
      ? editingAddress.label
      : '');

  const [forSomeoneElse, setForSomeoneElse] = useState(
    draft?.forSomeoneElse ?? editingAddress?.forSomeoneElse ?? false,
  );
  const [addressType, setAddressType] = useState<AddressType>(initialType);
  const [customLabel, setCustomLabel] = useState(initialCustomLabel);

  const [houseNo, setHouseNo] = useState(draft?.houseNo ?? editingAddress?.addressLine1 ?? '');
  const [streetName, setStreetName] = useState(
    selectedLocation.street || draft?.streetName || editingAddress?.addressLine2 || '',
  );
  const [landmark, setLandmark] = useState(
    selectedLocation.landmark || draft?.landmark || editingAddress?.landmark || '',
  );
  const [locality, setLocality] = useState(
    selectedLocation.locality || draft?.locality || editingAddress?.locality || '',
  );
  const [city, setCity] = useState(
    selectedLocation.city || draft?.city || editingAddress?.city || '',
  );
  const [stateName, setStateName] = useState(
    selectedLocation.state || draft?.stateName || editingAddress?.state || '',
  );
  const [postalCode, setPostalCode] = useState(
    selectedLocation.postalCode || draft?.postalCode || editingAddress?.postalCode || '',
  );

  const [fullName, setFullName] = useState(
    draft?.fullName ?? editingAddress?.recipientName ?? user?.name ?? '',
  );
  const [phone, setPhone] = useState(
    normalizePhoneDigits(draft?.phone ?? editingAddress?.phone ?? user?.phone),
  );
  const [isDefault, setIsDefault] = useState(
    draft?.isDefault ?? (isEditing ? Boolean(editingAddress?.isDefault) : true),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Persist user-entered form draft across map pin adjustments
  useEffect(() => {
    onDraftChange?.({
      forSomeoneElse,
      addressType,
      customLabel,
      houseNo,
      streetName,
      landmark,
      locality,
      city,
      stateName,
      postalCode,
      fullName,
      phone,
      isDefault,
    });
  }, [
    onDraftChange,
    forSomeoneElse,
    addressType,
    customLabel,
    houseNo,
    streetName,
    landmark,
    locality,
    city,
    stateName,
    postalCode,
    fullName,
    phone,
    isDefault,
  ]);

  const handleToggleRecipient = (someoneElse: boolean) => {
    setForSomeoneElse(someoneElse);
    if (!someoneElse) {
      setFullName(user?.name || '');
      setPhone(normalizePhoneDigits(user?.phone));
    } else if (fullName === (user?.name || '')) {
      setFullName('');
      setPhone('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (houseNo.trim().length < 2) {
      setErrorMessage('Please enter your Flat / House Number.');
      return;
    }
    if (city.trim().length < 2 || stateName.trim().length < 2) {
      setErrorMessage('City and State are required.');
      return;
    }
    if (!/^\d{6}$/.test(postalCode.trim())) {
      setErrorMessage('Please enter a valid 6-digit Indian PIN code.');
      return;
    }
    if (fullName.trim().length < 2) {
      setErrorMessage('Contact Full Name must be at least 2 characters.');
      return;
    }
    const cleanPhone = normalizePhoneDigits(phone);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    const resolvedLabel =
      addressType === 'HOME'
        ? 'Home'
        : addressType === 'OFFICE'
          ? 'Office'
          : customLabel.trim() || 'Other';

    const effectiveDefault = isEditing ? isDefault : true;

    setIsSubmitting(true);
    try {
      // Verify coordinates & PIN serviceability when creating or setting as default/active
      if (effectiveDefault || selectedLocation.latitude !== 0) {
        const serviceability = await LocationService.checkServiceability({
          latitude: selectedLocation.latitude || undefined,
          longitude: selectedLocation.longitude || undefined,
          postalCode: postalCode.trim(),
          city: city.trim(),
        });

        if (effectiveDefault && (!serviceability.isServiceable || !serviceability.activeStore)) {
          setErrorMessage(
            "Marvel's Basket is not serviceable at this location. Please select a serviceable location on the map.",
          );
          return;
        }
      }

      const payload = {
        addressType,
        label: resolvedLabel,
        recipientName: fullName.trim(),
        phone: cleanPhone,
        forSomeoneElse,
        addressLine1: houseNo.trim(),
        addressLine2: streetName.trim() || null,
        landmark: landmark.trim() || null,
        locality: locality.trim() || null,
        city: city.trim(),
        state: stateName.trim(),
        postalCode: postalCode.trim(),
        country: 'India',
        latitude: selectedLocation.latitude || null,
        longitude: selectedLocation.longitude || null,
        isDefault: effectiveDefault,
      };

      const saved =
        isEditing && editingAddress
          ? await addressService.update(editingAddress.id, payload)
          : await addressService.create(payload);

      await onAddressConfirmed(saved);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to save delivery address. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0 border-b border-border px-4 py-3 sm:px-5 sm:py-3.5">
        <button
          type="button"
          onClick={onBack}
          aria-label={isEditing ? 'Close edit address' : 'Back to map'}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink hover:bg-surface"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-base font-extrabold text-ink">
            {isEditing ? 'Edit Delivery Address' : 'Complete Address Details'}
          </h2>
          <p className="text-xs text-muted">Confirm location details &amp; contact info</p>
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Selected Location Summary */}
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-brand-tint/50 p-3.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin className="h-4 w-4 text-brand shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-brand uppercase">Selected Location</p>
              <p className="text-sm font-bold text-ink truncate">
                {selectedLocation.displayLocation}
              </p>
              {selectedLocation.formattedAddress && (
                <p className="text-xs text-muted line-clamp-1">
                  {selectedLocation.formattedAddress}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onChangeMapLocation}
            className="text-xs font-bold text-brand hover:underline shrink-0"
          >
            Change
          </button>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Who is this address for? */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary">
            Who is this address for?
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleToggleRecipient(false)}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                !forSomeoneElse
                  ? 'border-brand bg-brand-tint text-brand ring-1 ring-brand'
                  : 'border-border bg-white text-ink-secondary hover:bg-surface'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Myself</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleRecipient(true)}
              className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                forSomeoneElse
                  ? 'border-brand bg-brand-tint text-brand ring-1 ring-brand'
                  : 'border-border bg-white text-ink-secondary hover:bg-surface'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Someone Else</span>
            </button>
          </div>
        </div>

        {/* Save address as */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary">
            Save address as
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: 'HOME', label: 'Home', icon: Home },
                { value: 'OFFICE', label: 'Office', icon: Briefcase },
                { value: 'OTHER', label: 'Others', icon: MapPin },
              ] as const
            ).map(({ value, label, icon: Icon }) => {
              const active = addressType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAddressType(value)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                    active
                      ? 'border-brand bg-brand text-white shadow-xs'
                      : 'border-border bg-white text-ink-secondary hover:bg-surface'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {addressType === 'OTHER' && (
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Custom label (e.g. Parents' Home, Hostel)"
              aria-label="Custom address label"
            />
          )}
        </div>

        {/* Address Fields */}
        <div className="space-y-3">
          <Input
            label="Flat / House Number *"
            required
            value={houseNo}
            onChange={(e) => setHouseNo(e.target.value)}
            placeholder="Enter flat, house or apartment number"
          />

          <Input
            label="Street / Building Name (Optional)"
            value={streetName}
            onChange={(e) => setStreetName(e.target.value)}
            placeholder="Enter street or building name"
          />

          <Input
            label="Landmark (Optional)"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="Nearby landmark (optional)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Locality / Area"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="Locality"
            />
            <Input
              label="PIN Code *"
              required
              maxLength={6}
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit PIN"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="City *"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
            />
            <Input
              label="State *"
              required
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder="State"
            />
          </div>
        </div>

        {/* Separate Contact Details Section */}
        <div className="rounded-2xl border border-border bg-surface/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink">
            <Phone className="h-3.5 w-3.5 text-brand" />
            <span>Contact Details (For This Address)</span>
          </div>

          <Input
            label="Full Name *"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Recipient's full name"
          />

          <Input
            label="Contact Number *"
            required
            type="tel"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(normalizePhoneDigits(e.target.value))}
            placeholder="10-digit mobile number"
          />
          <p className="text-[11px] text-muted">
            Used solely by the delivery partner for this address. Editing this will not change your
            account phone number.
          </p>
        </div>

        {isEditing && (
          <Checkbox
            id="edit-address-default"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            label="Set as my active default delivery address"
            description="Used to resolve nearby stores on the navbar and storefront"
          />
        )}
      </div>

      {/* Bottom Sticky Primary CTA */}
      <div className="border-t border-border bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-brand hover:bg-forest text-white font-extrabold"
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          Confirm Address
        </Button>
      </div>
    </form>
  );
}
