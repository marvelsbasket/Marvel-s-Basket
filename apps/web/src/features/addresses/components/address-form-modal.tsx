'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Briefcase, Home, MapPin, Plus, Save } from 'lucide-react';
import { CreateAddressRequest, CustomerAddressResponse } from '@marvels-basket/shared';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { addressService } from '../services/address.service';

export interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (address: CustomerAddressResponse) => void;
  initialAddress?: CustomerAddressResponse | null;
}

export function AddressFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialAddress,
}: AddressFormModalProps) {
  const isEditing = Boolean(initialAddress);

  const [formData, setFormData] = useState<CreateAddressRequest>({
    label: 'Home',
    recipientName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: 'Azamgarh',
    state: 'Uttar Pradesh',
    postalCode: '276001',
    country: 'India',
    isDefault: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state whenever modal opens or initialAddress changes
  useEffect(() => {
    if (initialAddress) {
      setFormData({
        label: initialAddress.label || 'Home',
        recipientName: initialAddress.recipientName || '',
        phone: initialAddress.phone || '',
        addressLine1: initialAddress.addressLine1 || '',
        addressLine2: initialAddress.addressLine2 || '',
        landmark: initialAddress.landmark || '',
        city: initialAddress.city || 'Azamgarh',
        state: initialAddress.state || 'Uttar Pradesh',
        postalCode: initialAddress.postalCode || '276001',
        country: initialAddress.country || 'India',
        isDefault: initialAddress.isDefault ?? false,
      });
    } else {
      setFormData({
        label: 'Home',
        recipientName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        landmark: '',
        city: 'Azamgarh',
        state: 'Uttar Pradesh',
        postalCode: '276001',
        country: 'India',
        isDefault: false,
      });
    }
    setErrorMessage(null);
  }, [initialAddress, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // Validate phone number format
    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      setErrorMessage(
        'Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.',
      );
      setIsLoading(false);
      return;
    }

    // Validate PIN code format
    if (!/^\d{6}$/.test(formData.postalCode.trim())) {
      setErrorMessage('Please enter a valid 6-digit Indian PIN code.');
      setIsLoading(false);
      return;
    }

    try {
      const payload: CreateAddressRequest = {
        label: formData.label.trim(),
        recipientName: formData.recipientName.trim(),
        phone: formData.phone.trim(),
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2?.trim() || null,
        landmark: formData.landmark?.trim() || null,
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country?.trim() || 'India',
        isDefault: formData.isDefault,
      };

      let result: CustomerAddressResponse;
      if (isEditing && initialAddress) {
        result = await addressService.update(initialAddress.id, payload);
      } else {
        result = await addressService.create(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to save delivery address. Please check your inputs.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const labels = [
    { key: 'Home', icon: <Home className="h-4 w-4" /> },
    { key: 'Work', icon: <Briefcase className="h-4 w-4" /> },
    { key: 'Other', icon: <MapPin className="h-4 w-4" /> },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Delivery Address' : 'Add New Delivery Address'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-light/40 p-3 text-xs text-danger">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Address Label Pills */}
        <div>
          <label className="block text-xs font-bold text-ink mb-1.5 sm:text-sm">
            Save Address As
          </label>
          <div className="flex gap-2">
            {labels.map(({ key, icon }) => {
              const isSelected = formData.label === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, label: key })}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                    isSelected
                      ? 'border-brand bg-brand/10 text-brand ring-1 ring-brand'
                      : 'border-border bg-white text-ink hover:bg-surface'
                  }`}
                >
                  {icon}
                  {key}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Recipient Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label htmlFor="modal-name" className="block text-xs font-bold text-ink mb-1">
              Recipient Name <span className="text-danger">*</span>
            </label>
            <Input
              id="modal-name"
              type="text"
              required
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              placeholder="e.g. Rohan Sharma"
            />
          </div>

          <div>
            <label htmlFor="modal-phone" className="block text-xs font-bold text-ink mb-1">
              Contact Mobile Number <span className="text-danger">*</span>
            </label>
            <Input
              id="modal-phone"
              type="tel"
              required
              maxLength={10}
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })
              }
              placeholder="10-digit mobile number"
            />
          </div>
        </div>

        {/* 3. Address Lines */}
        <div>
          <label htmlFor="modal-addr1" className="block text-xs font-bold text-ink mb-1">
            Flat, House no., Building, Street <span className="text-danger">*</span>
          </label>
          <Input
            id="modal-addr1"
            type="text"
            required
            value={formData.addressLine1}
            onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
            placeholder="e.g. Flat 402, Green Valley Apartments"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label htmlFor="modal-addr2" className="block text-xs font-bold text-ink mb-1">
              Area, Locality, Sector
            </label>
            <Input
              id="modal-addr2"
              type="text"
              value={formData.addressLine2 || ''}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              placeholder="e.g. Civil Lines"
            />
          </div>

          <div>
            <label htmlFor="modal-landmark" className="block text-xs font-bold text-ink mb-1">
              Nearby Landmark
            </label>
            <Input
              id="modal-landmark"
              type="text"
              value={formData.landmark || ''}
              onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              placeholder="e.g. Near Collectorate / SBI"
            />
          </div>
        </div>

        {/* 4. City, State & PIN */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div>
            <label htmlFor="modal-city" className="block text-xs font-bold text-ink mb-1">
              City <span className="text-danger">*</span>
            </label>
            <Input
              id="modal-city"
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="modal-state" className="block text-xs font-bold text-ink mb-1">
              State <span className="text-danger">*</span>
            </label>
            <Input
              id="modal-state"
              type="text"
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="modal-pin" className="block text-xs font-bold text-ink mb-1">
              PIN Code <span className="text-danger">*</span>
            </label>
            <Input
              id="modal-pin"
              type="text"
              required
              maxLength={6}
              value={formData.postalCode}
              onChange={(e) =>
                setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, '') })
              }
            />
          </div>
        </div>

        {/* 5. Set as default checkbox */}
        <div className="pt-2">
          <Checkbox
            id="is-default-addr"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            label="Make this my default delivery address"
            description="Used automatically during quick checkout"
          />
        </div>

        {/* Footer buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-border">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="brand"
            size="md"
            isLoading={isLoading}
            leftIcon={isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          >
            {isEditing ? 'Update Address' : 'Save Address'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
