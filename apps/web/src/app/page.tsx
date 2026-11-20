'use client';

import React, { useState } from 'react';
import { CategoryRail, FeaturedSellers, HeroBanner, TrendingProducts } from '@/components/shared';
import { StorefrontLayout } from '@/components/layout/storefront-layout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DropdownDivider,
  DropdownItem,
  DropdownMenu,
  Input,
  Radio,
  Select,
  Switch,
  Textarea,
} from '@/components/ui';
import { EmptyState, ErrorState, Skeleton, Spinner } from '@/components/feedback';
import { Bell, Mail, Search, Send, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false);
  const [dialogConfirmed, setDialogConfirmed] = useState(false);
  const [switchActive, setSwitchActive] = useState(true);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [deliverySpeed, setDeliverySpeed] = useState('express');
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  return (
    <StorefrontLayout cartItemCount={2}>
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-6 space-y-10">
        {/* =================================================================== */}
        {/* 1. HERO PROMOTIONAL BANNER                                         */}
        {/* =================================================================== */}
        <HeroBanner />

        {/* =================================================================== */}
        {/* 2. QUICK-ACCESS CATEGORY RAIL                                       */}
        {/* =================================================================== */}
        <CategoryRail />

        {/* =================================================================== */}
        {/* 3. FEATURED SELLERS NEAR YOU                                       */}
        {/* =================================================================== */}
        <FeaturedSellers />

        {/* =================================================================== */}
        {/* 4. TRENDING PRODUCTS NEAR YOU (PHASE 08 CATALOG)                   */}
        {/* =================================================================== */}
        <TrendingProducts />

        {/* =================================================================== */}
        {/* 4. DESIGN SYSTEM & REUSABLE COMPONENT SHOWCASE                      */}
        {/* =================================================================== */}
        <section aria-labelledby="showcase-heading" className="pt-8 border-t border-border">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Phase 05 Foundation
              </span>
              <h2
                id="showcase-heading"
                className="text-xl font-extrabold text-ink sm:text-2xl tracking-tight"
              >
                Reusable UI Component Library &amp; Design Tokens
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="brand" shape="pill">
                WCAG 2.2 AA Accessible
              </Badge>
              <Badge variant="highlight" shape="pill">
                Design Reference Verified
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Buttons Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Button System</CardTitle>
                <CardDescription>
                  Semantics-first buttons with variants, sizes, and states.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="pill">
                    Primary CTA (Yellow)
                  </Button>
                  <Button variant="brand">Brand Green</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button variant="brand" size="sm">
                    Small
                  </Button>
                  <Button variant="brand" size="md">
                    Medium
                  </Button>
                  <Button variant="brand" size="lg">
                    Large
                  </Button>
                  <Button variant="brand" isLoading>
                    Loading State
                  </Button>
                  <Button variant="brand" disabled>
                    Disabled
                  </Button>
                  <Button variant="brand" leftIcon={<Send className="h-4 w-4" />}>
                    With Icon
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Input Controls Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Form Inputs &amp; Controls</CardTitle>
                <CardDescription>
                  Accessible form controls with states, icons, and error handling.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Email Address"
                  placeholder="rohan@example.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  helperText="We'll never share your email."
                />
                <Input
                  variant="pill"
                  placeholder="Pill Search Input Variant"
                  leftIcon={<Search className="h-4 w-4" />}
                />
                <Select
                  label="Delivery Window"
                  options={[
                    { value: 'instant', label: '10–30 Minutes (Instant Hyperlocal)' },
                    { value: 'morning', label: 'Tomorrow Morning (7:00 AM – 9:00 AM)' },
                    { value: 'evening', label: 'Tomorrow Evening (5:00 PM – 8:00 PM)' },
                  ]}
                />
                <div className="flex flex-wrap gap-6 pt-1">
                  <Radio
                    name="delivery-speed"
                    value="express"
                    checked={deliverySpeed === 'express'}
                    onChange={() => setDeliverySpeed('express')}
                    label="Express Delivery (15 mins)"
                  />
                  <Radio
                    name="delivery-speed"
                    value="standard"
                    checked={deliverySpeed === 'standard'}
                    onChange={() => setDeliverySpeed('standard')}
                    label="Standard Delivery (30 mins)"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <Checkbox
                    label="WhatsApp Updates"
                    description="Receive delivery tracking on WhatsApp"
                    checked={checkboxChecked}
                    onChange={(e) => setCheckboxChecked(e.target.checked)}
                  />
                  <Switch
                    label="Eco-Friendly Bag"
                    description="Use biodegradable paper bag"
                    checked={switchActive}
                    onCheckedChange={setSwitchActive}
                  />
                </div>
                <Textarea
                  label="Delivery Instructions"
                  placeholder="Leave at doorstep / Ring bell"
                />
              </CardContent>
            </Card>

            {/* Badges & Feedback States */}
            <Card>
              <CardHeader>
                <CardTitle>Badges, Pills &amp; Spinners</CardTitle>
                <CardDescription>
                  Visual indicators for trust signals, order status, and loading.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="highlight">Multiple Sellers</Badge>
                  <Badge variant="highlight">Best Prices</Badge>
                  <Badge variant="highlight">Quick Delivery</Badge>
                  <Badge variant="cta">Yellow CTA</Badge>
                  <Badge variant="brand">Brand Emerald</Badge>
                  <Badge variant="success">Active Store</Badge>
                  <Badge variant="warning">Low Stock</Badge>
                  <Badge variant="destructive">Sold Out</Badge>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span className="text-xs text-ink-muted">Small</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Spinner size="md" />
                    <span className="text-xs text-ink-muted">Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Spinner size="lg" />
                    <span className="text-xs text-ink-muted">Large</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-semibold text-ink mb-2">Skeleton Loaders:</p>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-10 w-10" shape="circle" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dialogs, Dropdowns & Feedback Blocks */}
            <Card>
              <CardHeader>
                <CardTitle>Interactive Modals &amp; States</CardTitle>
                <CardDescription>
                  Dialog primitives, accessible menus, empty states, and errors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="brand" onClick={() => setIsDemoDialogOpen(true)}>
                    Open Modal Dialog
                  </Button>

                  <DropdownMenu trigger={<Button variant="outline">Dropdown Menu ▾</Button>}>
                    <div className="px-3 py-1.5 text-xs font-bold text-ink">User Settings</div>
                    <DropdownDivider />
                    <DropdownItem icon={<Bell className="h-4 w-4" />}>
                      Notification Preferences
                    </DropdownItem>
                    <DropdownItem icon={<Sparkles className="h-4 w-4" />}>
                      Coupons &amp; Offers
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem destructive>Sign Out</DropdownItem>
                  </DropdownMenu>
                </div>

                <div className="pt-2 space-y-4">
                  <ErrorState
                    title="Simulated Network Error"
                    message={
                      retryNotice ||
                      'Example error boundary component with accessible retry action.'
                    }
                    onRetry={() => setRetryNotice('Retry succeeded! Connection restored.')}
                  />

                  <EmptyState
                    title="No Orders Found"
                    description="Your shopping cart is currently empty. Browse categories to add essentials."
                    actionLabel="Browse Groceries"
                    onAction={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Demo Dialog Instance */}
        <Dialog
          isOpen={isDemoDialogOpen}
          onClose={() => setIsDemoDialogOpen(false)}
          title="Accessible Dialog Component"
          description="Focus-trapped modal dialog with escape-key and outside-click support."
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsDemoDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  setDialogConfirmed(true);
                  setIsDemoDialogOpen(false);
                }}
              >
                Confirm Action
              </Button>
            </>
          }
        >
          <div className="space-y-3 py-2">
            <p className="text-xs text-ink-secondary leading-relaxed">
              This modal component adheres to WCAG 2.2 AA accessibility standards. It locks
              background body scrolling, manages ARIA attributes, and responds to keyboard
              navigation.
            </p>
            <div className="rounded-xl bg-surface p-3 text-xs font-mono text-ink">
              status: {dialogConfirmed ? 'confirmed' : 'verified'} | role: dialog | aria-modal: true
            </div>
          </div>
        </Dialog>
      </div>
    </StorefrontLayout>
  );
}
