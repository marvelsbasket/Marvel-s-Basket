'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-banner bg-gradient-to-r from-forest via-brand to-emerald-800 p-6 sm:p-8 md:p-12 text-white shadow-lg">
      {/* Background Organic Wave Accent */}
      <div
        className="pointer-events-none absolute -bottom-10 left-1/3 h-44 w-96 rounded-full bg-lime-500/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 grid items-center gap-8 md:grid-cols-12">
        {/* Left Column: Value Proposition & CTAs */}
        <div className="space-y-6 md:col-span-7 lg:col-span-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl leading-[1.15]">
            Groceries &amp; Daily Essentials Delivered Fast!
          </h1>

          {/* 3 Capsule Highlight Badges matching design reference */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge
              variant="highlight"
              shape="pill"
              className="px-3.5 py-1 text-xs sm:text-sm font-bold shadow-xs"
            >
              Multiple Sellers
            </Badge>
            <Badge
              variant="highlight"
              shape="pill"
              className="px-3.5 py-1 text-xs sm:text-sm font-bold shadow-xs"
            >
              Best Prices
            </Badge>
            <Badge
              variant="highlight"
              shape="pill"
              className="px-3.5 py-1 text-xs sm:text-sm font-bold shadow-xs"
            >
              Quick Delivery
            </Badge>
          </div>

          {/* Primary CTA Button */}
          <div className="pt-2">
            <Link href="/categories">
              <Button
                variant="primary"
                size="pill"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                className="text-base px-7 py-3 shadow-cta transition-transform hover:scale-105 active:scale-95"
              >
                Shop Now
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Column: Branded Shopping Basket Composite Photography */}
        <div className="relative flex items-center justify-center md:col-span-5 lg:col-span-4">
          <div className="relative h-64 w-64 sm:h-72 sm:w-72 lg:h-80 lg:w-80 transition-transform duration-300 hover:scale-105">
            <Image
              src="/images/logo.png"
              alt="Marvel's Basket full of fresh groceries and daily essentials"
              fill
              sizes="(max-width: 768px) 256px, 320px"
              priority
              className="object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
