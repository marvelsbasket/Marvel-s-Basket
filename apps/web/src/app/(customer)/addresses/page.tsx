'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react';
import { CustomerAddressResponse } from '@marvels-basket/shared';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { AddressCard, DeleteAddressDialog, addressService } from '@/features/addresses';
import {
  toDeliveryLocationFromAddress,
  useLocation,
} from '@/features/location/context/location-context';
import { useBasket } from '@/features/basket/context/basket-context';

export default function AddressesPage() {
  const { location, openAddressFlow, refreshSavedAddresses, clearLocation } = useLocation();
  const { requestLocationSwitch } = useBasket();

  const [addresses, setAddresses] = useState<CustomerAddressResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAddress, setDeletingAddress] = useState<CustomerAddressResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSettingDefault, setIsSettingDefault] = useState(false);

  const fetchAddresses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await addressService.list();
      setAddresses(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load delivery addresses.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleOpenAddModal = () => {
    openAddressFlow({
      mode: 'profile-add',
      onSavedAddress: async () => {
        showFeedback('New delivery address added and set as active.');
        await fetchAddresses();
      },
    });
  };

  const handleOpenEditModal = (addr: CustomerAddressResponse) => {
    openAddressFlow({
      mode: 'profile-edit',
      editingAddress: addr,
      onSavedAddress: async () => {
        showFeedback('Address updated successfully.');
        await fetchAddresses();
      },
    });
  };

  const handleOpenDeleteDialog = (addr: CustomerAddressResponse) => {
    setDeletingAddress(addr);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAddress) return;
    const deletedId = deletingAddress.id;
    setIsDeleting(true);
    try {
      await addressService.delete(deletedId);
      showFeedback('Address deleted successfully.');
      setIsDeleteDialogOpen(false);
      setDeletingAddress(null);

      const remaining = await refreshSavedAddresses();
      setAddresses(remaining);

      // Keep navbar and store context synchronized if the active/default address was removed
      if (location?.addressId === deletedId) {
        const nextDefault = remaining.find((a) => a.isDefault) || remaining[0] || null;
        if (nextDefault) {
          await requestLocationSwitch(toDeliveryLocationFromAddress(nextDefault));
        } else {
          clearLocation();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete address.';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setIsSettingDefault(true);
    try {
      const updated = await addressService.setDefault(addressId);
      showFeedback('Default delivery address updated.');
      await fetchAddresses();
      await refreshSavedAddresses();
      await requestLocationSwitch(toDeliveryLocationFromAddress(updated));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to set default address.';
      setError(msg);
    } finally {
      setIsSettingDefault(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs"
            aria-label="Back to Profile"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-ink sm:text-2xl">Delivery Addresses</h1>
            <p className="text-xs text-ink-muted">
              Manage locations for quick-commerce doorstep delivery
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="brand"
          size="sm"
          onClick={handleOpenAddModal}
          leftIcon={<Plus className="h-4 w-4" />}
          className="w-full sm:w-auto"
        >
          Add New Address
        </Button>
      </div>

      {/* 2. Success Feedback Toast */}
      {feedbackMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-light/40 p-3.5 text-xs font-semibold text-success sm:text-sm animate-fade-in shadow-xs">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* 3. Address List / Empty / Error States */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
          <ErrorState title="Addresses Unavailable" message={error} onRetry={fetchAddresses} />
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 shadow-card text-center">
          <EmptyState
            title="No Saved Addresses"
            description="You haven't saved any delivery addresses yet. Add your home or office address to start ordering fresh groceries!"
            actionLabel="Add Your First Address"
            onAction={handleOpenAddModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onEdit={handleOpenEditModal}
              onDelete={handleOpenDeleteDialog}
              onSetDefault={handleSetDefault}
              isUpdatingDefault={isSettingDefault}
            />
          ))}
        </div>
      )}

      {/* 4. Delete Address Confirmation Dialog */}
      <DeleteAddressDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingAddress(null);
        }}
        onConfirm={handleConfirmDelete}
        address={deletingAddress}
        isDeleting={isDeleting}
      />
    </div>
  );
}
