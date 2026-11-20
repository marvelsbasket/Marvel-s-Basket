'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Grid,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { CategoryTreeItem } from '@marvels-basket/shared';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { AdminCatalogService } from '@/features/catalog/services/admin-catalog.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/feedback/spinner';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryTreeItem | null>(null);
  const [formParentId, setFormParentId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTaxCode, setFormTaxCode] = useState('');
  const [formGstRate, setFormGstRate] = useState<string>('');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Image Upload Modal States
  const [uploadCategoryTarget, setUploadCategoryTarget] = useState<{
    id: string;
    name: string;
    type: 'icon' | 'banner';
  } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadCategories = () => {
    setLoading(true);
    AdminCatalogService.listCategories()
      .then((data) => {
        setCategories(data);
        // Expand all root categories by default
        setExpandedIds(new Set(data.map((c) => c.id)));
      })
      .catch((err) => {
        console.error('Failed to load admin categories:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenCreate = (parentId: string | null = null) => {
    setEditingCategory(null);
    setFormParentId(parentId);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormTaxCode('');
    setFormGstRate('');
    setFormDisplayOrder(0);
    setFormIsActive(true);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryTreeItem) => {
    setEditingCategory(cat);
    setFormParentId(cat.parentId || null);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description || '');
    setFormTaxCode(cat.taxCode || '');
    setFormGstRate(
      cat.defaultGstRate !== null && cat.defaultGstRate !== undefined
        ? String(cat.defaultGstRate)
        : '',
    );
    setFormDisplayOrder(cat.displayOrder || 0);
    setFormIsActive(cat.isActive !== false);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingCategory) {
        await AdminCatalogService.updateCategory(editingCategory.id, {
          name: formName,
          slug: formSlug || undefined,
          description: formDescription || undefined,
          parentId: formParentId || undefined,
          taxCode: formTaxCode || undefined,
          defaultGstRate: formGstRate !== '' ? Number(formGstRate) : undefined,
          displayOrder: Number(formDisplayOrder),
          isActive: formIsActive,
        });
      } else {
        await AdminCatalogService.createCategory({
          name: formName,
          slug: formSlug || undefined,
          description: formDescription || undefined,
          parentId: formParentId || undefined,
          taxCode: formTaxCode || undefined,
          defaultGstRate: formGstRate !== '' ? Number(formGstRate) : undefined,
          displayOrder: Number(formDisplayOrder),
          isActive: formIsActive,
        });
      }
      setIsFormModalOpen(false);
      loadCategories();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (cat: CategoryTreeItem) => {
    if (
      !confirm(
        `Are you sure you want to delete category '${cat.name}'? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await AdminCatalogService.deleteCategory(cat.id);
      loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCategoryTarget || !uploadFile) return;

    setUploading(true);
    setUploadError(null);

    try {
      if (uploadCategoryTarget.type === 'icon') {
        await AdminCatalogService.uploadCategoryIcon(uploadCategoryTarget.id, uploadFile);
      } else {
        await AdminCatalogService.uploadCategoryBanner(uploadCategoryTarget.id, uploadFile);
      }
      setUploadCategoryTarget(null);
      setUploadFile(null);
      loadCategories();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  // Filter categories by search term
  const filteredCategories = categories.filter((c) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const matchesParent =
      c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term);
    const matchesChild = c.subcategories?.some(
      (sub) => sub.name.toLowerCase().includes(term) || sub.slug.toLowerCase().includes(term),
    );
    return matchesParent || matchesChild;
  });

  return (
    <AuthGuard requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-stone-50 pb-16">
        {/* Admin Navigation Header */}
        <div className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-sm font-extrabold text-emerald-700">
                Marvel&apos;s Basket Admin
              </Link>
              <nav className="flex items-center gap-4 text-sm font-semibold">
                <Link
                  href="/admin/categories"
                  className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-800 font-bold"
                >
                  Categories
                </Link>
                <Link
                  href="/admin/products"
                  className="rounded-lg px-3 py-1.5 text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Master Products
                </Link>
                <Link
                  href="/admin/sellers"
                  className="rounded-lg px-3 py-1.5 text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Seller Approvals
                </Link>
              </nav>
            </div>
            <div>
              <Button
                variant="brand"
                onClick={() => handleOpenCreate(null)}
                className="flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Department</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900">
                Category Taxonomy &amp; Hierarchy
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Manage 2-tier product departments, subcategories, Cloudinary icons, and GST tax
                codes.
              </p>
            </div>
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>

          {/* Categories List Card */}
          <Card className="border-stone-200 shadow-xs">
            <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-3.5 px-6">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-500">
                <span>Category / Department Hierarchy</span>
                <span>Products &amp; Actions</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <Spinner size="lg" />
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="p-12 text-center text-sm text-stone-500">
                  No categories found matching your query.
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {filteredCategories.map((cat) => {
                    const isExpanded = expandedIds.has(cat.id);
                    const subcategories = cat.subcategories || [];

                    return (
                      <div key={cat.id} className="group">
                        {/* Parent Category Row */}
                        <div className="flex items-center justify-between px-6 py-4 hover:bg-stone-50/80 transition-colors">
                          <div className="flex items-center gap-3.5">
                            {/* Expand/Collapse Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleExpand(cat.id)}
                              className="rounded-md p-1 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>

                            {/* Category Icon */}
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 overflow-hidden">
                              {cat.iconUrl ? (
                                <img
                                  src={cat.iconUrl}
                                  alt={cat.name}
                                  className="h-8 w-8 object-contain"
                                />
                              ) : (
                                <Grid className="h-5 w-5" />
                              )}
                            </div>

                            {/* Title & Slug */}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-stone-900 text-sm">{cat.name}</span>
                                {cat.isActive ? (
                                  <Badge
                                    variant="brand"
                                    shape="pill"
                                    className="text-[10px] px-2 py-0"
                                  >
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="neutral"
                                    shape="pill"
                                    className="text-[10px] px-2 py-0"
                                  >
                                    Inactive
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                                <span>slug: {cat.slug}</span>
                                {cat.taxCode && <span>• Tax: {cat.taxCode}</span>}
                                {cat.defaultGstRate !== null &&
                                  cat.defaultGstRate !== undefined && (
                                    <span>• GST: {cat.defaultGstRate}%</span>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <span className="mr-3 text-xs font-bold text-stone-500">
                              {cat.productCount} {cat.productCount === 1 ? 'item' : 'items'}
                            </span>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenCreate(cat.id)}
                              title="Add Subcategory"
                              className="h-8 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Subcategory
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setUploadCategoryTarget({
                                  id: cat.id,
                                  name: cat.name,
                                  type: 'icon',
                                })
                              }
                              title="Upload Icon"
                              className="h-8 w-8 p-0 text-stone-500 hover:text-emerald-700"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(cat)}
                              title="Edit"
                              className="h-8 w-8 p-0 text-stone-500 hover:text-stone-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(cat)}
                              title="Delete"
                              className="h-8 w-8 p-0 text-stone-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Nested Subcategories */}
                        {isExpanded && subcategories.length > 0 && (
                          <div className="bg-stone-50/50 pl-14 pr-6 divide-y divide-stone-100/80 border-t border-stone-100">
                            {subcategories.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between py-2.5 hover:bg-white transition-colors rounded-lg px-2"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-2 rounded-full bg-stone-300" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-stone-800">
                                        {sub.name}
                                      </span>
                                      {!sub.isActive && (
                                        <span className="text-[10px] font-semibold text-stone-400">
                                          (Inactive)
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-stone-400">
                                      slug: {sub.slug}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="mr-3 text-xs text-stone-400">
                                    {sub.productCount} items
                                  </span>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setUploadCategoryTarget({
                                        id: sub.id,
                                        name: sub.name,
                                        type: 'icon',
                                      })
                                    }
                                    title="Upload Icon"
                                    className="h-7 w-7 p-0 text-stone-400 hover:text-emerald-700"
                                  >
                                    <Upload className="h-3.5 w-3.5" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEdit(sub)}
                                    title="Edit Subcategory"
                                    className="h-7 w-7 p-0 text-stone-400 hover:text-stone-800"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(sub)}
                                    title="Delete Subcategory"
                                    className="h-7 w-7 p-0 text-stone-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal: Create / Edit Category */}
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
              <h2 className="text-lg font-black text-stone-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                {formParentId ? 'Adding subcategory under parent' : 'Adding top-level department'}
              </p>

              {formError && (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-stone-700">Category Name *</label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!editingCategory && !formSlug) {
                        setFormSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, ''),
                        );
                      }
                    }}
                    placeholder="e.g. Dairy & Bakery"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700">Slug (URL)</label>
                  <Input
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. dairy-bakery"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700">Description</label>
                  <Input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Short description for SEO and category card"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700">HSN/Tax Code</label>
                    <Input
                      value={formTaxCode}
                      onChange={(e) => setFormTaxCode(e.target.value)}
                      placeholder="e.g. 0401"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700">Default GST (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="28"
                      value={formGstRate}
                      onChange={(e) => setFormGstRate(e.target.value)}
                      placeholder="e.g. 5"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="h-4 w-4 rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Active in Storefront</span>
                  </label>

                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <span>Order:</span>
                    <input
                      type="number"
                      value={formDisplayOrder}
                      onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                      className="w-14 rounded-md border border-stone-200 px-2 py-0.5 text-center font-bold text-stone-800"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-stone-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormModalOpen(false)}
                    disabled={formSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="brand" disabled={formSubmitting}>
                    {formSubmitting ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Cloudinary Icon Upload */}
        {uploadCategoryTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
              <h2 className="text-lg font-black text-stone-900">
                Upload Category {uploadCategoryTarget.type === 'icon' ? 'Icon' : 'Banner'}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Target:{' '}
                <span className="font-bold text-stone-800">{uploadCategoryTarget.name}</span>
              </p>

              {uploadError && (
                <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-600 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-emerald-700 hover:file:bg-emerald-100"
                />

                <div className="flex justify-end gap-2.5 pt-2 border-t border-stone-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setUploadCategoryTarget(null);
                      setUploadFile(null);
                    }}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="brand" disabled={uploading || !uploadFile}>
                    {uploading ? 'Uploading...' : 'Upload Asset'}
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
