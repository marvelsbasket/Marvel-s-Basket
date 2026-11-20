'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CatalogStoreMappingItem,
  ProductDetailItem,
  ProductStatus,
  ProductVariantItem,
} from '@marvels-basket/shared';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { AdminCatalogService } from '@/features/catalog/services/admin-catalog.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/feedback/spinner';
import { cn } from '@/lib/utils';

export default function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [product, setProduct] = useState<ProductDetailItem | null>(null);
  const [storeListings, setStoreListings] = useState<CatalogStoreMappingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'variants' | 'stores' | 'details'>('variants');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Variant Modal
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariantItem | null>(null);
  const [varName, setVarName] = useState('');
  const [varPackSize, setVarPackSize] = useState('');
  const [varUnitValue, setVarUnitValue] = useState<number | ''>('');
  const [varUnitType, setVarUnitType] = useState('g');
  const [varMrp, setVarMrp] = useState<number | ''>('');
  const [varSku, setVarSku] = useState('');
  const [varBarcode, setVarBarcode] = useState('');
  const [varIsActive, setVarIsActive] = useState(true);
  const [varSubmitting, setVarSubmitting] = useState(false);

  // Image Upload Modal
  const [uploadTargetVariantId, setUploadTargetVariantId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadIsPrimary, setUploadIsPrimary] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [prod, stores] = await Promise.all([
        AdminCatalogService.getProduct(id),
        AdminCatalogService.getStoreListings(id),
      ]);
      setProduct(prod);
      setStoreListings(stores);
    } catch (err: any) {
      console.error('Failed to load product:', err);
      setActionError(err.message || 'Failed to load product data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleStatusChange = async (newStatus: ProductStatus) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await AdminCatalogService.updateProductStatus(id, {
        status: newStatus as any,
      });
      setProduct(updated);
      setActionSuccess(`Product status changed to ${newStatus} successfully.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update product status.');
    }
  };

  const handleOpenAddVariant = () => {
    setEditingVariant(null);
    setVarName('');
    setVarPackSize('');
    setVarUnitValue('');
    setVarUnitType('g');
    setVarMrp('');
    setVarSku('');
    setVarBarcode('');
    setVarIsActive(true);
    setIsVariantModalOpen(true);
  };

  const handleOpenEditVariant = (v: ProductVariantItem) => {
    setEditingVariant(v);
    setVarName(v.name);
    setVarPackSize(v.packSize || v.name);
    setVarUnitValue(v.unitValue ?? '');
    setVarUnitType(v.unitType || 'g');
    setVarMrp(v.mrp);
    setVarSku(v.sku || '');
    setVarBarcode(v.barcode || '');
    setVarIsActive(v.isActive !== false);
    setIsVariantModalOpen(true);
  };

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVarSubmitting(true);
    setActionError(null);

    const payload = {
      name: varName,
      packSize: varPackSize || varName,
      unitValue: varUnitValue !== '' ? Number(varUnitValue) : undefined,
      unitType: varUnitType,
      mrp: Number(varMrp),
      sku: varSku || undefined,
      barcode: varBarcode || undefined,
      isActive: varIsActive,
    };

    try {
      if (editingVariant) {
        await AdminCatalogService.updateVariant(id, editingVariant.id, payload);
      } else {
        await AdminCatalogService.addVariant(id, payload);
      }
      setIsVariantModalOpen(false);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save variant');
    } finally {
      setVarSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    try {
      await AdminCatalogService.deleteVariant(id, variantId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete variant');
    }
  };

  const handleUploadImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTargetVariantId || !uploadFile) return;

    setUploading(true);
    setActionError(null);

    try {
      await AdminCatalogService.uploadVariantImage(
        id,
        uploadTargetVariantId,
        uploadFile,
        uploadIsPrimary,
      );
      setUploadTargetVariantId(null);
      setUploadFile(null);
      setUploadIsPrimary(false);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to upload variant image');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (variantId: string, imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      await AdminCatalogService.deleteVariantImage(id, variantId, imageId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete image');
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
        <div className="flex h-screen items-center justify-center bg-stone-50">
          <Spinner size="lg" />
        </div>
      </AuthGuard>
    );
  }

  if (!product) {
    return (
      <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
        <div className="p-8 text-center text-sm text-stone-500">Product not found.</div>
      </AuthGuard>
    );
  }

  const primaryThumb = product.variants?.[0]?.primaryImageUrl;

  return (
    <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-stone-50 pb-20">
        {/* Navigation Bar */}
        <div className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/products"
                className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Master Products</span>
              </Link>
              <span className="text-stone-300">/</span>
              <span className="text-xs font-bold text-stone-900 line-clamp-1">{product.name}</span>
            </div>
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
            >
              <span>View Storefront Preview</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Content Body */}
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 space-y-6">
          {/* Header Action Card */}
          <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 p-1.5 overflow-hidden">
                {primaryThumb ? (
                  <img
                    src={primaryThumb}
                    alt={product.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ShoppingBag className="h-8 w-8 text-stone-300" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-black text-stone-900 sm:text-2xl tracking-tight">
                    {product.name}
                  </h1>
                  <Badge
                    variant={product.status === ProductStatus.ACTIVE ? 'brand' : 'neutral'}
                    shape="pill"
                    className="text-xs px-2.5 py-0.5"
                  >
                    {product.status}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-500 font-medium">
                  <span>
                    Category: <strong>{product.category?.name || 'Unassigned'}</strong>
                  </span>
                  <span>
                    Brand: <strong>{product.brand || 'Unbranded'}</strong>
                  </span>
                  <span>
                    Slug: <code className="font-mono text-stone-600">{product.slug}</code>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Publishing Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {product.status !== ProductStatus.ACTIVE ? (
                <Button
                  variant="brand"
                  onClick={() => handleStatusChange(ProductStatus.ACTIVE)}
                  className="shadow-sm font-black"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Publish (ACTIVE)
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange(ProductStatus.INACTIVE)}
                  className="font-bold text-stone-700"
                >
                  Unpublish (INACTIVE)
                </Button>
              )}

              {product.status !== ProductStatus.DISCONTINUED && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange(ProductStatus.DISCONTINUED)}
                  className="text-red-700 hover:bg-red-50 border-red-200 font-bold"
                >
                  Discontinue
                </Button>
              )}
            </div>
          </div>

          {/* Feedback Notices */}
          {actionError && (
            <div className="rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="flex border-b border-stone-200">
            <button
              onClick={() => setActiveTab('variants')}
              className={cn(
                'border-b-2 px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors',
                activeTab === 'variants'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-stone-500 hover:text-stone-900',
              )}
            >
              Pack Variants &amp; Images ({product.variants?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('stores')}
              className={cn(
                'border-b-2 px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors',
                activeTab === 'stores'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-stone-500 hover:text-stone-900',
              )}
            >
              Store Inventory Listings ({storeListings.length})
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={cn(
                'border-b-2 px-5 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors',
                activeTab === 'details'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-stone-500 hover:text-stone-900',
              )}
            >
              Product Overview &amp; Compliance
            </button>
          </div>

          {/* TAB 1: Variants & Images */}
          {activeTab === 'variants' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-stone-900">Pack Variants</h2>
                  <p className="text-xs text-stone-500">
                    Each variant defines a unique pack size, MRP, barcode, and gallery images (max 5
                    images per variant).
                  </p>
                </div>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={handleOpenAddVariant}
                  className="flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Pack Variant</span>
                </Button>
              </div>

              {/* Variants Cards List */}
              <div className="space-y-4">
                {product.variants?.map((v) => (
                  <Card key={v.id} className="border-stone-200 shadow-xs overflow-hidden">
                    <CardHeader className="bg-stone-50/70 border-b border-stone-100 py-3.5 px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-stone-900 text-sm">
                            {v.name} ({v.packSize})
                          </span>
                          <span className="text-xs font-black text-stone-800">MRP: ₹{v.mrp}</span>
                          {v.sku && (
                            <span className="font-mono text-[11px] text-stone-500 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                              SKU: {v.sku}
                            </span>
                          )}
                          {v.isActive ? (
                            <Badge variant="brand" shape="pill" className="text-[10px] px-2 py-0">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="neutral" shape="pill" className="text-[10px] px-2 py-0">
                              Inactive
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUploadTargetVariantId(v.id);
                              setUploadFile(null);
                              setUploadIsPrimary(false);
                            }}
                            className="h-8 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                          >
                            <Upload className="h-3.5 w-3.5 mr-1" />
                            Upload Image ({v.images?.length || 0}/5)
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditVariant(v)}
                            className="h-8 w-8 p-0 text-stone-500 hover:text-stone-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVariant(v.id)}
                            className="h-8 w-8 p-0 text-stone-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Variant Gallery Images */}
                    <CardContent className="p-6">
                      <div className="flex flex-wrap gap-4 items-center">
                        {v.images && v.images.length > 0 ? (
                          v.images.map((img) => (
                            <div
                              key={img.id}
                              className="group relative h-28 w-28 rounded-2xl border border-stone-200 bg-white p-2 shadow-2xs flex items-center justify-center overflow-hidden"
                            >
                              <img
                                src={img.imageUrl}
                                alt="Variant asset"
                                className="max-h-full max-w-full object-contain"
                              />
                              {img.isPrimary && (
                                <span className="absolute top-1 left-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-xs">
                                  Primary
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(v.id, img.id)}
                                title="Delete Image"
                                className="absolute bottom-1 right-1 rounded-md bg-white/90 p-1 text-red-600 shadow-xs hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-stone-400 italic">
                            No gallery images uploaded yet for this variant.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Store Inventory Listings */}
          {activeTab === 'stores' && (
            <Card className="border-stone-200 shadow-xs">
              <CardHeader className="bg-stone-50/70 border-b border-stone-100 py-3.5 px-6">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-stone-700">
                  Store Partner Inventory Mappings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {storeListings.length === 0 ? (
                  <div className="p-12 text-center text-sm text-stone-500">
                    No active store partners currently stock this master product.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {storeListings.map((mapping, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-6 py-4 hover:bg-stone-50/50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm">
                              {mapping.storeName}
                            </span>
                            <span className="text-xs text-stone-500">
                              ({mapping.storeCity || 'India'})
                            </span>
                            <Badge variant="brand" shape="pill" className="text-[10px] px-2 py-0">
                              {mapping.status}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-stone-500">
                            <span>
                              Selling Price:{' '}
                              <strong className="text-stone-900">₹{mapping.sellingPrice}</strong>
                            </span>
                            <span>Platform MRP: ₹{mapping.mrp}</span>
                            <span>
                              Available Stock:{' '}
                              <strong className="text-emerald-700">
                                {mapping.availableStock} units
                              </strong>
                            </span>
                            {mapping.lowStockThreshold && (
                              <span>Low Stock Threshold: {mapping.lowStockThreshold}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-stone-400">
                          Last Updated:{' '}
                          {mapping.lastInventoryUpdate
                            ? new Date(mapping.lastInventoryUpdate).toLocaleDateString()
                            : 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Product Details & Compliance */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="border-stone-200 shadow-xs">
                <CardHeader className="bg-stone-50/70 border-b border-stone-100 py-3.5 px-6">
                  <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-stone-700">
                    Descriptions &amp; Copy
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 text-xs">
                  <div>
                    <span className="font-bold text-stone-700">Short Description:</span>
                    <p className="mt-1 text-stone-600">{product.shortDescription || 'None'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-stone-700">Full Description:</span>
                    <p className="mt-1 text-stone-600 leading-relaxed whitespace-pre-line">
                      {product.description || 'None'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-stone-700">Search Tags:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {product.searchTags?.map((tag, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-stone-100 px-2 py-0.5 text-stone-600 font-mono"
                        >
                          {tag}
                        </span>
                      )) || <span className="text-stone-400">No tags</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-stone-200 shadow-xs">
                <CardHeader className="bg-stone-50/70 border-b border-stone-100 py-3.5 px-6">
                  <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-stone-700">
                    Compliance &amp; Storage
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-stone-700">Country of Origin:</span>{' '}
                    <span className="text-stone-800">{product.countryOfOrigin || 'India'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-700">Shelf Life:</span>{' '}
                    <span className="text-stone-800">{product.shelfLife || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-700">Storage Instructions:</span>{' '}
                    <span className="text-stone-800">{product.storageInstructions || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-700">Manufacturer:</span>{' '}
                    <span className="text-stone-800">{product.manufacturerDetails || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-700">Packer:</span>{' '}
                    <span className="text-stone-800">{product.packerDetails || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-700">Ingredients:</span>{' '}
                    <span className="text-stone-800">{product.ingredients || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Modal: Add / Edit Variant */}
        {isVariantModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
              <h2 className="text-lg font-black text-stone-900">
                {editingVariant ? 'Edit Variant' : 'Add Pack Variant'}
              </h2>
              <form onSubmit={handleVariantSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-stone-700">Variant Name *</label>
                  <Input
                    required
                    placeholder="e.g. 1 L Tetra Pak"
                    value={varName}
                    onChange={(e) => {
                      setVarName(e.target.value);
                      if (!varPackSize) setVarPackSize(e.target.value);
                    }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700">Pack Size Label *</label>
                  <Input
                    required
                    placeholder="e.g. 1 L"
                    value={varPackSize}
                    onChange={(e) => setVarPackSize(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700">Unit Value</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 1"
                      value={varUnitValue}
                      onChange={(e) =>
                        setVarUnitValue(e.target.value ? Number(e.target.value) : '')
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700">Unit Type</label>
                    <select
                      value={varUnitType}
                      onChange={(e) => setVarUnitType(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-bold text-stone-800"
                    >
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="pcs">pcs</option>
                      <option value="pack">pack</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700">MRP (₹) *</label>
                  <Input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="66"
                    value={varMrp}
                    onChange={(e) => setVarMrp(e.target.value ? Number(e.target.value) : '')}
                    className="mt-1 font-bold text-stone-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700">SKU Code</label>
                    <Input
                      placeholder="Autogenerated if empty"
                      value={varSku}
                      onChange={(e) => setVarSku(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700">Barcode</label>
                    <Input
                      placeholder="e.g. 8901234..."
                      value={varBarcode}
                      onChange={(e) => setVarBarcode(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-2 text-xs font-bold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={varIsActive}
                    onChange={(e) => setVarIsActive(e.target.checked)}
                    className="h-4 w-4 rounded-sm text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Variant Active in Storefront</span>
                </label>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsVariantModalOpen(false)}
                    disabled={varSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="brand" disabled={varSubmitting}>
                    {varSubmitting ? 'Saving...' : editingVariant ? 'Update' : 'Add Variant'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Variant Image Upload */}
        {uploadTargetVariantId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
              <h2 className="text-lg font-black text-stone-900">Upload Variant Image</h2>
              <p className="mt-1 text-xs text-stone-500">
                High resolution pack photo (Cloudinary, max 5 images).
              </p>

              <form onSubmit={handleUploadImageSubmit} className="mt-4 space-y-4">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-600 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-emerald-700 hover:file:bg-emerald-100"
                />

                <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadIsPrimary}
                    onChange={(e) => setUploadIsPrimary(e.target.checked)}
                    className="h-4 w-4 rounded-sm text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Set as Primary Variant Thumbnail</span>
                </label>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-stone-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUploadTargetVariantId(null)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="brand" disabled={uploading || !uploadFile}>
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
