import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Store, MapPin, Clock, Compass, Navigation } from 'lucide-react';

export interface StepStoreInfoProps {
  formData: {
    storeDisplayName: string;
    storeCategory: string;
    addressLine1: string;
    addressLine2: string;
    landmark: string;
    city: string;
    state: string;
    postalCode: string;
    latitude: number | string;
    longitude: number | string;
    serviceRadiusKm: number | string;
    openingTime: string;
    closingTime: string;
    weeklyOffDays: string;
  };
  onChange: (field: string, value: string | number | boolean | null) => void;
  errors?: Record<string, string>;
}

const CATEGORIES = [
  { value: 'GROCERY', label: 'Groceries & Daily Staples' },
  { value: 'FRUITS_VEGETABLES', label: 'Fresh Fruits & Vegetables' },
  { value: 'MEAT_DAIRY', label: 'Dairy, Eggs & Fresh Meat' },
  { value: 'BAKERY', label: 'Bakery & Confectionery' },
  { value: 'BEVERAGES', label: 'Cold Drinks, Juices & Beverages' },
  { value: 'PHARMACY', label: 'Pharmacy & Wellness' },
  { value: 'GENERAL_STORE', label: 'General / Kirana Store' },
  { value: 'OTHER', label: 'Other Approved Category' },
];

export function StepStoreInfo({ formData, onChange, errors = {} }: StepStoreInfoProps) {
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsMessage('Geolocation is not supported by your browser');
      return;
    }

    setDetectingGps(true);
    setGpsMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange('latitude', Number(position.coords.latitude.toFixed(6)));
        onChange('longitude', Number(position.coords.longitude.toFixed(6)));
        setGpsMessage('GPS coordinates updated successfully!');
        setDetectingGps(false);
      },
      () => {
        setGpsMessage('Unable to retrieve location. Please enter coordinates manually.');
        setDetectingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-ink">Store / Dark Store Information</h3>
        <p className="text-xs text-ink-muted mt-0.5">
          Provide your physical supermarket or grocery counter details for customer discovery and
          rider pickup.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Store Display Name */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-brand" />
            Store Display Name (Customer-facing) <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.storeDisplayName}
            onChange={(e) => onChange('storeDisplayName', e.target.value)}
            placeholder="e.g. Fresh Farms Supermarket"
            className={errors.storeDisplayName ? 'border-red-500' : ''}
          />
          {errors.storeDisplayName && (
            <p className="text-[11px] text-red-500 font-medium">{errors.storeDisplayName}</p>
          )}
        </div>

        {/* Store Category */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            Primary Store Category <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.storeCategory || 'GROCERY'}
            onChange={(e) => onChange('storeCategory', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-ink-muted">
            Note: Grocery, Bakery, and Food categories require mandatory FSSAI food safety
            compliance.
          </p>
        </div>

        {/* Address Line 1 */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand" />
            Shop / Building Address (Line 1) <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.addressLine1}
            onChange={(e) => onChange('addressLine1', e.target.value)}
            placeholder="e.g. Shop #12, Ground Floor, Central Market"
            className={errors.addressLine1 ? 'border-red-500' : ''}
          />
          {errors.addressLine1 && (
            <p className="text-[11px] text-red-500 font-medium">{errors.addressLine1}</p>
          )}
        </div>

        {/* Address Line 2 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Street / Area (Line 2)</label>
          <Input
            value={formData.addressLine2}
            onChange={(e) => onChange('addressLine2', e.target.value)}
            placeholder="e.g. Station Road"
          />
        </div>

        {/* Landmark */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">Landmark</label>
          <Input
            value={formData.landmark}
            onChange={(e) => onChange('landmark', e.target.value)}
            placeholder="e.g. Near Clock Tower"
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            City <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder="e.g. Azamgarh"
            className={errors.city ? 'border-red-500' : ''}
          />
          {errors.city && <p className="text-[11px] text-red-500 font-medium">{errors.city}</p>}
        </div>

        {/* State */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            State <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.state}
            onChange={(e) => onChange('state', e.target.value)}
            placeholder="e.g. Uttar Pradesh"
            className={errors.state ? 'border-red-500' : ''}
          />
          {errors.state && <p className="text-[11px] text-red-500 font-medium">{errors.state}</p>}
        </div>

        {/* PIN Code */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink">
            PIN Code <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.postalCode}
            onChange={(e) => onChange('postalCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="e.g. 276001"
            className={errors.postalCode ? 'border-red-500' : ''}
          />
          {errors.postalCode && (
            <p className="text-[11px] text-red-500 font-medium">{errors.postalCode}</p>
          )}
        </div>

        {/* Service Radius */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-brand" />
            Delivery Service Radius (km) <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.serviceRadiusKm || 5}
            onChange={(e) => onChange('serviceRadiusKm', Number(e.target.value))}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value={2}>2 km (Express Ultra-Local)</option>
            <option value={3}>3 km (Standard Hyperlocal)</option>
            <option value={5}>5 km (Default Operational Target)</option>
            <option value={7}>7 km (Extended Service Area)</option>
            <option value={10}>10 km (Maximum Perimeter)</option>
          </select>
        </div>

        {/* Geo-Coordinates Box */}
        <div className="md:col-span-2 p-4 rounded-xl border border-border bg-surface-subtle space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-brand" />
                Store Geographic Coordinates (Lat / Lng)
              </h4>
              <p className="text-[11px] text-ink-muted">
                Essential for customer store discovery and delivery distance calculation.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDetectLocation}
              disabled={detectingGps}
              className="text-xs font-semibold shrink-0"
            >
              <Navigation className="w-3.5 h-3.5 mr-1 text-brand" />
              {detectingGps ? 'Locating...' : 'Use Device GPS'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-ink-secondary">Latitude</label>
              <Input
                type="number"
                step="0.000001"
                value={formData.latitude}
                onChange={(e) => onChange('latitude', parseFloat(e.target.value))}
                placeholder="26.068800"
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ink-secondary">Longitude</label>
              <Input
                type="number"
                step="0.000001"
                value={formData.longitude}
                onChange={(e) => onChange('longitude', parseFloat(e.target.value))}
                placeholder="83.185900"
                className="text-xs"
              />
            </div>
          </div>

          {gpsMessage && <p className="text-[11px] font-medium text-brand-dark">{gpsMessage}</p>}
        </div>

        {/* Operating Hours */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-brand" />
            Opening Time (24h) <span className="text-red-500">*</span>
          </label>
          <Input
            type="time"
            value={formData.openingTime || '07:00'}
            onChange={(e) => onChange('openingTime', e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-brand" />
            Closing Time (24h) <span className="text-red-500">*</span>
          </label>
          <Input
            type="time"
            value={formData.closingTime || '22:00'}
            onChange={(e) => onChange('closingTime', e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-ink">Weekly Off-Days</label>
          <select
            value={formData.weeklyOffDays || 'None'}
            onChange={(e) => onChange('weeklyOffDays', e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="None">Open All 7 Days (No Weekly Off)</option>
            <option value="Sunday">Sunday</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
          </select>
        </div>
      </div>
    </div>
  );
}
