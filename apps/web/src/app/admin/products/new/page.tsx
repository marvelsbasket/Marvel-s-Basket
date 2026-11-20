'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { BrandItem, CategoryTreeItem, FoodPreference } from '@marvels-basket/shared';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { AdminCatalogService } from '@/features/catalog/services/admin-catalog.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function NewMasterProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);

  // Form State: 1. Basic Info
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [brandId, setBrandId] = useState('');
  const [brandName, setBrandName] = useState('');
  const [foodPreference, setFoodPreference] = useState<FoodPreference>(FoodPreference.VEG);
  const [isFeatured, setIsFeatured] = useState(false);
  const [searchTagsInput, setSearchTagsInput] = useState('');

  // Form State: 2. Categorization
  const [selectedParentCatId, setSelectedParentCatId] = useState('');
  const [selectedSubCatId, setSelectedSubCatId] = useState('');

  // Form State: 3. Descriptions
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');

  // Form State: 4. Initial Variant
  const [variantName, setVariantName] = useState('Standard Pack');
  const [packSize, setPackSize] = useState('');
  const [unitValue, setUnitValue] = useState<number | ''>('');
  const [unitType, setUnitType] = useState('g');
  const [mrp, setMrp] = useState<number | ''>('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');

  // Form State: 5. Compliance & Consumer Protection
  const [countryOfOrigin, setCountryOfOrigin] = useState('India');
  const [manufacturerDetails, setManufacturerDetails] = useState('');
  const [packerDetails, setPackerDetails] = useState('');
  const [shelfLife, setShelfLife] = useState('');
  const [storageInstructions, setStorageInstructions] = useState('');

  // Form State: 6. Ingredients & Nutrition
  const [ingredients, setIngredients] = useState('');
  const [energyKcal, setEnergyKcal] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [fatG, setFatG] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [cats, brs] = await Promise.all([
          AdminCatalogService.listCategories(),
          AdminCatalogService.listBrands(),
        ]);
        setCategories(cats);
        setBrands(brs);
      } catch (err) {
        console.error('Failed to load catalog metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Update slug automatically when typing name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (
      !slug ||
      slug ===
        val
          .slice(0, -1)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
    ) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      );
    }
  };

  const selectedParentCat = categories.find((c) => c.id === selectedParentCatId);
  const availableSubcategories = selectedParentCat?.subcategories || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Form validations
    const targetCategoryId = selectedSubCatId || selectedParentCatId;
    if (!targetCategoryId) {
      setErrorMessage('Please select a category or subcategory.');
      setIsSubmitting(false);
      return;
    }

    if (!mrp || Number(mrp) <= 0) {
      setErrorMessage('Please specify a positive MRP for the product variant.');
      setIsSubmitting(false);
      return;
    }

    // Build nutritional JSON object
    const nutritionalInfo: Record<string, string> = {};
    if (energyKcal) nutritionalInfo.energy = `${energyKcal} kcal`;
    if (proteinG) nutritionalInfo.protein = `${proteinG} g`;
    if (carbsG) nutritionalInfo.carbohydrates = `${carbsG} g`;
    if (fatG) nutritionalInfo.fat = `${fatG} g`;

    // Process search tags
    const searchTags = searchTagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const payload = {
      name,
      slug: slug || undefined,
      categoryId: targetCategoryId,
      brandId: brandId || undefined,
      brand: brandName || undefined,
      shortDescription: shortDescription || undefined,
      description: description || undefined,
      foodPreference,
      countryOfOrigin,
      manufacturerDetails: manufacturerDetails || undefined,
      packerDetails: packerDetails || undefined,
      shelfLife: shelfLife || undefined,
      storageInstructions: storageInstructions || undefined,
      ingredients: ingredients || undefined,
      nutritionalInfo: Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : undefined,
      searchTags: searchTags.length > 0 ? searchTags : undefined,
      isFeatured,
      initialVariant: {
        name: variantName || 'Standard Pack',
        packSize: packSize || variantName || 'Standard Pack',
        unitValue: unitValue !== '' ? Number(unitValue) : undefined,
        unitType: unitType || undefined,
        mrp: Number(mrp),
        sku: sku || undefined,
        barcode: barcode || undefined,
      },
    };

    try {
      const created = await AdminCatalogService.createProduct(payload as any);
      router.push(`/admin/products/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create master product.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-stone-50 pb-20">
        {/* Navigation Bar */}
        <div className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/products"
                className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Catalog</span>
              </Link>
              <span className="text-stone-300">/</span>
              <span className="text-xs font-bold text-stone-900">New Master Product</span>
            </div>
          </div>
        </div>

        {/* Wizard Container */}
        <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
          <div className="mb-6">
            <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
              Create Master Catalog Product
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Platform-owned master record. Store inventory and selling prices map separately.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Basic Information */}
            <Card className="border-stone-200 shadow-xs">
              <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-stone-700">
                  1. Basic Information &amp; Taxonomy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-stone-700">
                      Product Title (Master Name) *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Amul Taaza Homogenised Toned Milk"
                      value={name}
                      onChange={handleNameChange}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">
                      Product Slug (URL Identifier)
                    </label>
                    <Input
                      placeholder="e.g. amul-taaza-toned-milk"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">Brand</label>
                    <select
                      value={brandId}
                      onChange={(e) => {
                        setBrandId(e.target.value);
                        const b = brands.find((br) => br.id === e.target.value);
                        if (b) setBrandName(b.name);
                      }}
                      className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-bold text-stone-800"
                    >
                      <option value="">Select or Type Brand...</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">
                      Food Preference Indicator
                    </label>
                    <select
                      value={foodPreference}
                      onChange={(e) => setFoodPreference(e.target.value as FoodPreference)}
                      className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-bold text-stone-800"
                    >
                      <option value={FoodPreference.VEG}>Vegetarian (Green Dot)</option>
                      <option value={FoodPreference.NON_VEG}>Non-Vegetarian (Red Dot)</option>
                      <option value={FoodPreference.VEGAN}>Vegan</option>
                      <option value={FoodPreference.NA}>Not Applicable (Non-food/General)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="h-4 w-4 rounded-sm text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Feature on Homepage Carousels</span>
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-stone-700">
                      Search Tags &amp; Indian Synonyms (comma-separated)
                    </label>
                    <Input
                      placeholder="e.g. milk, doodh, toned, dairy, cow milk"
                      value={searchTagsInput}
                      onChange={(e) => setSearchTagsInput(e.target.value)}
                      className="mt-1"
                    />
                    <span className="text-[10px] text-stone-400">
                      Used by quick-commerce search engine to match regional customer queries.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Categorization */}
            <Card className="border-stone-200 shadow-xs">
              <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-stone-700">
                  2. Department &amp; Subcategory Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-stone-700">
                      Department / Parent Category *
                    </label>
                    <select
                      required
                      value={selectedParentCatId}
                      onChange={(e) => {
                        setSelectedParentCatId(e.target.value);
                        setSelectedSubCatId('');
                      }}
                      className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-bold text-stone-800"
                    >
                      <option value="">Select Department...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">
                      Subcategory (Optional if assigning directly)
                    </label>
                    <select
                      value={selectedSubCatId}
                      disabled={!selectedParentCatId || availableSubcategories.length === 0}
                      onChange={(e) => setSelectedSubCatId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-bold text-stone-800 disabled:bg-stone-100 disabled:text-stone-400"
                    >
                      <option value="">Select Subcategory...</option>
                      {availableSubcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Descriptions */}
            <Card className="border-stone-200 shadow-xs">
              <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-stone-700">
                  3. Product Descriptions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-700">
                    Short Description (1-2 lines for product card)
                  </label>
                  <Input
                    placeholder="e.g. Fresh pasteurized toned milk with 3.0% fat content."
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700">
                    Detailed Product Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Full product overview, benefits, usage, and culinary notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-3 text-xs leading-relaxed text-stone-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 4. Initial Variant Details */}
            <Card className="border-stone-200 shadow-xs">
              <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-stone-700">
                  4. Initial Pack Variant (SKU &amp; MRP)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700">Variant Name *</label>
                    <Input
                      required
                      placeholder="e.g. 500 ml Pouch"
                      value={variantName}
                      onChange={(e) => {
                        setVariantName(e.target.value);
                        if (!packSize) setPackSize(e.target.value);
                      }}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">Pack Size Label *</label>
                    <Input
                      required
                      placeholder="e.g. 500 ml"
                      value={packSize}
                      onChange={(e) => setPackSize(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">
                      Maximum Retail Price (MRP) *
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-2.5 text-xs font-extrabold text-stone-500">
                        ₹
                      </span>
                      <Input
                        required
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="35"
                        value={mrp}
                        onChange={(e) => setMrp(e.target.value ? Number(e.target.value) : '')}
                        className="pl-7 font-bold text-stone-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">Net Quantity / Value</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 500"
                      value={unitValue}
                      onChange={(e) => setUnitValue(e.target.value ? Number(e.target.value) : '')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">Unit Type</label>
                    <select
                      value={unitType}
                      onChange={(e) => setUnitType(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-bold text-stone-800"
                    >
                      <option value="ml">ml (Milliliters)</option>
                      <option value="L">L (Liters)</option>
                      <option value="g">g (Grams)</option>
                      <option value="kg">kg (Kilograms)</option>
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="pack">pack (Multi-pack)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">SKU Code (Optional)</label>
                    <Input
                      placeholder="e.g. MB-AMUL-500"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">
                      Barcode / EAN (Optional)
                    </label>
                    <Input
                      placeholder="e.g. 8901234567890"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-stone-500">
                  More pack sizes and high-resolution Cloudinary images can be uploaded on the next
                  screen once created.
                </div>
              </CardContent>
            </Card>

            {/* 5. Compliance & Regulatory */}
            <Card className="border-stone-200 shadow-xs">
              <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-stone-700">
                  5. Compliance &amp; Consumer Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-stone-700">Country of Origin *</label>
                    <Input
                      required
                      value={countryOfOrigin}
                      onChange={(e) => setCountryOfOrigin(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">Shelf Life</label>
                    <Input
                      placeholder="e.g. 180 Days (unopened)"
                      value={shelfLife}
                      onChange={(e) => setShelfLife(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-stone-700">Storage Instructions</label>
                    <Input
                      placeholder="e.g. Store in a cool dry place. Keep refrigerated after opening."
                      value={storageInstructions}
                      onChange={(e) => setStorageInstructions(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">Manufacturer Details</label>
                    <Input
                      placeholder="e.g. Gujarat Co-operative Milk Marketing Federation Ltd."
                      value={manufacturerDetails}
                      onChange={(e) => setManufacturerDetails(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700">Packer Details</label>
                    <Input
                      placeholder="e.g. Amul Dairy Plant, Anand, Gujarat - 388001"
                      value={packerDetails}
                      onChange={(e) => setPackerDetails(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 6. Ingredients & Nutrition */}
            <Card className="border-stone-200 shadow-xs">
              <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-stone-700">
                  6. Ingredients &amp; Nutrition (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-700">Ingredients</label>
                  <Input
                    placeholder="e.g. Pasteurized Toned Milk, Vitamin A, Vitamin D2"
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
                  <div>
                    <label className="text-xs font-bold text-stone-700">Energy (kcal)</label>
                    <Input
                      placeholder="58"
                      value={energyKcal}
                      onChange={(e) => setEnergyKcal(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700">Protein (g)</label>
                    <Input
                      placeholder="3.0"
                      value={proteinG}
                      onChange={(e) => setProteinG(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700">Carbs (g)</label>
                    <Input
                      placeholder="4.7"
                      value={carbsG}
                      onChange={(e) => setCarbsG(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700">Fat (g)</label>
                    <Input
                      placeholder="3.0"
                      value={fatG}
                      onChange={(e) => setFatG(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Link href="/admin/products">
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="brand" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Master Product...' : 'Create Master Product (DRAFT)'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
