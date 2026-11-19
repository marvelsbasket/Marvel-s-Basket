import {
  PrismaClient,
  UserRoleType,
  UserStatus,
  SellerStatus,
  ProductStatus,
  SellerProductStatus,
  VerificationStatus,
  CommissionType,
  DiscountType,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
};

async function main() {
  console.log('🌱 Starting Marvel’s Basket Development Database Seed...');

  const devPasswordHash = await hashPassword('MarvelDevPassword2026!');

  // ============================================================================
  // 1. Roles & Permissions
  // ============================================================================
  console.log('  -> Seeding Roles & Permissions...');

  const rolesData = [
    {
      name: UserRoleType.SUPER_ADMIN,
      description: 'Super Administrator with platform-wide privileges',
    },
    {
      name: UserRoleType.ADMIN,
      description: 'Platform operations and administrative support staff',
    },
    { name: UserRoleType.SELLER, description: 'Registered store owner / merchant fulfiller' },
    {
      name: UserRoleType.CUSTOMER,
      description: 'End-consumer purchasing groceries and daily essentials',
    },
    { name: UserRoleType.DELIVERY_PARTNER, description: 'Hyperlocal logistics delivery rider' },
  ];

  const rolesMap = new Map<string, string>();
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, roleType: r.name },
      create: { name: r.name, roleType: r.name, description: r.description },
    });
    rolesMap.set(r.name, role.id);
  }

  const permissionsList = [
    { key: 'product:create', description: 'Create master catalog products' },
    { key: 'product:update', description: 'Update master catalog products' },
    { key: 'product:delete', description: 'Delete or archive catalog products' },
    { key: 'product:view', description: 'View catalog products' },
    { key: 'order:create', description: 'Create customer orders' },
    { key: 'order:view', description: 'View customer / store orders' },
    { key: 'order:update', description: 'Update order statuses' },
    { key: 'order:cancel', description: 'Cancel pending orders' },
    { key: 'seller:onboard', description: 'Submit merchant onboarding requests' },
    { key: 'seller:approve', description: 'Authorize merchant approval and KYC' },
    { key: 'seller:suspend', description: 'Suspend or hold merchant stores' },
    { key: 'payment:view', description: 'Inspect payment logs and transactions' },
    { key: 'refund:process', description: 'Review and authorize customer refunds' },
    { key: 'settlement:manage', description: 'Manage merchant batch settlements' },
    { key: 'platform:manage', description: 'Modify global platform settings' },
  ];

  const permMap = new Map<string, string>();
  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description },
      create: { key: p.key, description: p.description },
    });
    permMap.set(p.key, perm.id);
  }

  // Grant all permissions to SUPER_ADMIN
  const superAdminRoleId = rolesMap.get(UserRoleType.SUPER_ADMIN)!;
  for (const permId of permMap.values()) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRoleId,
          permissionId: permId,
        },
      },
      update: {},
      create: {
        roleId: superAdminRoleId,
        permissionId: permId,
      },
    });
  }

  // ============================================================================
  // 2. Users (SuperAdmin, Customer, Sellers, Delivery Partner)
  // ============================================================================
  console.log('  -> Seeding Users & User Profiles...');

  // 2.1 Super Admin User
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'admin@marvelsbasket.com' },
    update: { status: UserStatus.ACTIVE, passwordHash: devPasswordHash },
    create: {
      name: 'Marvel SuperAdmin',
      email: 'admin@marvelsbasket.com',
      phone: '+919999900001',
      passwordHash: devPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdminUser.id,
        roleId: superAdminRoleId,
      },
    },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: superAdminRoleId,
    },
  });

  // 2.2 Sample Customer
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer.dev@marvelsbasket.com' },
    update: { status: UserStatus.ACTIVE, passwordHash: devPasswordHash },
    create: {
      name: 'Rohan Sharma',
      email: 'customer.dev@marvelsbasket.com',
      phone: '+919999900002',
      passwordHash: devPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: customerUser.id,
        roleId: rolesMap.get(UserRoleType.CUSTOMER)!,
      },
    },
    update: {},
    create: {
      userId: customerUser.id,
      roleId: rolesMap.get(UserRoleType.CUSTOMER)!,
    },
  });

  await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      dateOfBirth: new Date('1995-05-15'),
      avatarUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80',
    },
  });

  await prisma.customerAddress.deleteMany({
    where: { userId: customerUser.id },
  });

  await prisma.customerAddress.create({
    data: {
      userId: customerUser.id,
      label: 'Home',
      recipientName: 'Rohan Sharma',
      phone: '+919999900002',
      addressLine1: 'Flat 402, Marvel Heights, MG Road',
      addressLine2: 'Near Trinity Metro Station',
      landmark: 'Opposite Central Mall',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
      isDefault: true,
    },
  });

  // 2.3 Store 1 Owner & Seller Entity
  const seller1User = await prisma.user.upsert({
    where: { email: 'seller1@marvelsbasket.com' },
    update: { status: UserStatus.ACTIVE, passwordHash: devPasswordHash },
    create: {
      name: 'Anand Verma',
      email: 'seller1@marvelsbasket.com',
      phone: '+919999900003',
      passwordHash: devPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: seller1User.id,
        roleId: rolesMap.get(UserRoleType.SELLER)!,
      },
    },
    update: {},
    create: {
      userId: seller1User.id,
      roleId: rolesMap.get(UserRoleType.SELLER)!,
    },
  });

  const store1 = await prisma.seller.upsert({
    where: { slug: 'fresh-farms-indiranagar' },
    update: {
      status: SellerStatus.APPROVED,
      ownerUserId: seller1User.id,
    },
    create: {
      ownerUserId: seller1User.id,
      businessName: 'Fresh Farms Daily - Indiranagar',
      slug: 'fresh-farms-indiranagar',
      businessEmail: 'freshfarms.indiranagar@marvelsbasket.com',
      businessPhone: '+919999900003',
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      status: SellerStatus.APPROVED,
      approvalDate: new Date(),
    },
  });

  await prisma.sellerProfile.upsert({
    where: { sellerId: store1.id },
    update: {},
    create: {
      sellerId: store1.id,
      description: 'Finest organic staples, farm-fresh milk, and daily grocery essentials.',
      addressLine1: 'Shop #12, 100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      country: 'India',
      latitude: 12.9784,
      longitude: 77.6408,
      openingTime: '07:00',
      closingTime: '22:00',
      preparationTime: 15,
    },
  });

  // Business Hours (7 days a week)
  for (let day = 0; day <= 6; day++) {
    await prisma.sellerBusinessHours.upsert({
      where: {
        sellerId_dayOfWeek: {
          sellerId: store1.id,
          dayOfWeek: day,
        },
      },
      update: {},
      create: {
        sellerId: store1.id,
        dayOfWeek: day,
        openingTime: '07:00',
        closingTime: '22:00',
        isClosed: false,
      },
    });
  }

  // Service Area
  await prisma.sellerServiceArea.deleteMany({ where: { sellerId: store1.id } });
  await prisma.sellerServiceArea.createMany({
    data: [
      { sellerId: store1.id, postalCode: '560038', radiusKm: 5.0, isActive: true },
      { sellerId: store1.id, postalCode: '560001', radiusKm: 7.0, isActive: true },
    ],
  });

  // 2.4 Store 2 Owner & Seller Entity (To demonstrate multi-store listings)
  const seller2User = await prisma.user.upsert({
    where: { email: 'seller2@marvelsbasket.com' },
    update: { status: UserStatus.ACTIVE, passwordHash: devPasswordHash },
    create: {
      name: 'Pooja Patel',
      email: 'seller2@marvelsbasket.com',
      phone: '+919999900004',
      passwordHash: devPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: seller2User.id,
        roleId: rolesMap.get(UserRoleType.SELLER)!,
      },
    },
    update: {},
    create: {
      userId: seller2User.id,
      roleId: rolesMap.get(UserRoleType.SELLER)!,
    },
  });

  const store2 = await prisma.seller.upsert({
    where: { slug: 'nature-fresh-koramangala' },
    update: {
      status: SellerStatus.APPROVED,
      ownerUserId: seller2User.id,
    },
    create: {
      ownerUserId: seller2User.id,
      businessName: 'Nature Fresh Mart - Koramangala',
      slug: 'nature-fresh-koramangala',
      businessEmail: 'naturefresh.koramangala@marvelsbasket.com',
      businessPhone: '+919999900004',
      gstin: '29XYZAB5678C1Z2',
      pan: 'XYZAB5678C',
      status: SellerStatus.APPROVED,
      approvalDate: new Date(),
    },
  });

  await prisma.sellerProfile.upsert({
    where: { sellerId: store2.id },
    update: {},
    create: {
      sellerId: store2.id,
      description: 'Quick hyperlocal groceries, dairy, and cold-pressed cooking oils.',
      addressLine1: 'Shop #4, 5th Block, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560095',
      country: 'India',
      latitude: 12.9352,
      longitude: 77.6245,
      openingTime: '08:00',
      closingTime: '21:30',
      preparationTime: 20,
    },
  });

  // 2.5 Delivery Rider
  const riderUser = await prisma.user.upsert({
    where: { email: 'rider1@marvelsbasket.com' },
    update: { status: UserStatus.ACTIVE, passwordHash: devPasswordHash },
    create: {
      name: 'Vikram Singh',
      email: 'rider1@marvelsbasket.com',
      phone: '+919999900005',
      passwordHash: devPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: riderUser.id,
        roleId: rolesMap.get(UserRoleType.DELIVERY_PARTNER)!,
      },
    },
    update: {},
    create: {
      userId: riderUser.id,
      roleId: rolesMap.get(UserRoleType.DELIVERY_PARTNER)!,
    },
  });

  await prisma.deliveryPartner.upsert({
    where: { userId: riderUser.id },
    update: {},
    create: {
      userId: riderUser.id,
      vehicleType: 'MOTORCYCLE',
      vehicleNumber: 'KA-01-EQ-9876',
      verificationStatus: VerificationStatus.VERIFIED,
      availabilityStatus: 'ONLINE',
      rating: 4.9,
    },
  });

  // ============================================================================
  // 3. Product Catalog (Categories & Master Products)
  // ============================================================================
  console.log('  -> Seeding Categories & Master Product Catalog...');

  const catStaples = await prisma.category.upsert({
    where: { slug: 'groceries-staples' },
    update: {},
    create: {
      name: 'Groceries & Staples',
      slug: 'groceries-staples',
      description: 'Aata, rice, dal, edible oils, and dry spices.',
      displayOrder: 1,
      isActive: true,
    },
  });

  const catDairy = await prisma.category.upsert({
    where: { slug: 'dairy-bakery' },
    update: {},
    create: {
      name: 'Dairy & Bakery',
      slug: 'dairy-bakery',
      description: 'Fresh milk, butter, paneer, curd, and bakery bread.',
      displayOrder: 2,
      isActive: true,
    },
  });

  const catBeverages = await prisma.category.upsert({
    where: { slug: 'beverages' },
    update: {},
    create: {
      name: 'Beverages',
      slug: 'beverages',
      description: 'Premium tea, filter coffee, fruit juices, and cold sodas.',
      displayOrder: 3,
      isActive: true,
    },
  });

  // Master Products
  const prodRice = await prisma.product.upsert({
    where: { slug: 'india-gate-classic-basmati-rice-1kg' },
    update: {},
    create: {
      categoryId: catStaples.id,
      name: 'India Gate Classic Basmati Rice (1kg)',
      slug: 'india-gate-classic-basmati-rice-1kg',
      description: 'Aged long-grain basmati rice with exquisite aroma and delicate texture.',
      brand: 'India Gate',
      sku: 'SKU-RICE-BASMATI-001',
      status: ProductStatus.ACTIVE,
    },
  });

  const prodAtta = await prisma.product.upsert({
    where: { slug: 'aashirvaad-sharbati-atta-5kg' },
    update: {},
    create: {
      categoryId: catStaples.id,
      name: 'Aashirvaad Superior MP Sharbati Atta (5kg)',
      slug: 'aashirvaad-sharbati-atta-5kg',
      description: '100% whole wheat flour crafted from golden Madhya Pradesh Sharbati grains.',
      brand: 'Aashirvaad',
      sku: 'SKU-ATTA-AASH-002',
      status: ProductStatus.ACTIVE,
    },
  });

  const prodMilk = await prisma.product.upsert({
    where: { slug: 'amul-taaza-toned-milk-1l' },
    update: {},
    create: {
      categoryId: catDairy.id,
      name: 'Amul Taaza Homogenised Toned Milk (1L)',
      slug: 'amul-taaza-toned-milk-1l',
      description: 'Fresh toned milk with 3.0% fat, sterilized and packed in aseptic carton.',
      brand: 'Amul',
      sku: 'SKU-MILK-AMUL-003',
      status: ProductStatus.ACTIVE,
    },
  });

  const prodTea = await prisma.product.upsert({
    where: { slug: 'tata-tea-gold-blend-500g' },
    update: {},
    create: {
      categoryId: catBeverages.id,
      name: 'Tata Tea Gold Blend (500g)',
      slug: 'tata-tea-gold-blend-500g',
      description: 'Fine Assam CTC tea with 15% gently rolled long tea leaves for rich aroma.',
      brand: 'Tata Tea',
      sku: 'SKU-TEA-TATA-004',
      status: ProductStatus.ACTIVE,
    },
  });

  // ============================================================================
  // 4. Store Listings (SellerProduct) & Store Inventory
  // ============================================================================
  console.log('  -> Seeding Store Listings & Stock Inventories...');

  // Helper to upsert a store product listing with stock inventory
  const upsertListingWithInventory = async (
    sellerId: string,
    productId: string,
    sellingPrice: number,
    mrp: number,
    availableStock: number,
    sellerSku: string,
  ) => {
    let listing = await prisma.sellerProduct.findFirst({
      where: {
        sellerId,
        productId,
        variantId: null,
      },
    });

    if (listing) {
      listing = await prisma.sellerProduct.update({
        where: { id: listing.id },
        data: {
          sellingPrice,
          mrp,
          sellerSku,
          status: SellerProductStatus.ACTIVE,
        },
      });
    } else {
      listing = await prisma.sellerProduct.create({
        data: {
          sellerId,
          productId,
          sellingPrice,
          mrp,
          sellerSku,
          status: SellerProductStatus.ACTIVE,
        },
      });
    }

    await prisma.inventory.upsert({
      where: { sellerProductId: listing.id },
      update: {
        availableQuantity: availableStock,
        reservedQuantity: 0,
        lowStockThreshold: 5,
      },
      create: {
        sellerProductId: listing.id,
        availableQuantity: availableStock,
        reservedQuantity: 0,
        lowStockThreshold: 5,
      },
    });

    return listing;
  };

  // Store 1 Listings (Indiranagar)
  await upsertListingWithInventory(store1.id, prodRice.id, 165.0, 180.0, 50, 'IND-RICE-01');
  await upsertListingWithInventory(store1.id, prodAtta.id, 285.0, 310.0, 40, 'IND-ATTA-01');
  await upsertListingWithInventory(store1.id, prodMilk.id, 56.0, 56.0, 100, 'IND-MILK-01');
  await upsertListingWithInventory(store1.id, prodTea.id, 290.0, 320.0, 60, 'IND-TEA-01');

  // Store 2 Listings (Koramangala) — Demonstrating hybrid marketplace price variance
  await upsertListingWithInventory(store2.id, prodRice.id, 160.0, 180.0, 35, 'KOR-RICE-01'); // Cheaper rice at Store 2
  await upsertListingWithInventory(store2.id, prodMilk.id, 55.0, 56.0, 80, 'KOR-MILK-01'); // Cheaper milk at Store 2

  // ============================================================================
  // 5. Commission Rules
  // ============================================================================
  console.log('  -> Seeding Category Commission Rules...');

  await prisma.commissionRule.deleteMany({
    where: {
      name: {
        in: ['Groceries & Staples Commission', 'Dairy & Bakery Commission', 'Beverages Commission'],
      },
    },
  });

  await prisma.commissionRule.createMany({
    data: [
      {
        name: 'Groceries & Staples Commission',
        commissionType: CommissionType.PERCENTAGE,
        commissionRate: 10.0, // 10%
        categoryId: catStaples.id,
        isActive: true,
      },
      {
        name: 'Dairy & Bakery Commission',
        commissionType: CommissionType.PERCENTAGE,
        commissionRate: 8.0, // 8%
        categoryId: catDairy.id,
        isActive: true,
      },
      {
        name: 'Beverages Commission',
        commissionType: CommissionType.PERCENTAGE,
        commissionRate: 12.0, // 12%
        categoryId: catBeverages.id,
        isActive: true,
      },
    ],
  });

  // ============================================================================
  // 6. Marketing Coupons
  // ============================================================================
  console.log('  -> Seeding Promotional Coupons...');

  await prisma.coupon.upsert({
    where: { code: 'WELCOME50' },
    update: { isActive: true },
    create: {
      code: 'WELCOME50',
      description: 'Flat ₹50 OFF on your first grocery basket of ₹299 or more.',
      discountType: DiscountType.FLAT,
      discountValue: 50.0,
      minimumOrderAmount: 299.0,
      maximumDiscount: 50.0,
      usageLimit: 1000,
      perUserLimit: 1,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      isActive: true,
    },
  });

  // ============================================================================
  // 7. Platform Settings
  // ============================================================================
  console.log('  -> Seeding Platform Settings...');

  const settingsData = [
    {
      key: 'platform_name',
      value: "Marvel's Basket",
      description: 'Official marketplace brand name',
    },
    { key: 'currency', value: 'INR', description: 'Default marketplace operating currency' },
    {
      key: 'support_email',
      value: 'support@marvelsbasket.com',
      description: 'Customer and merchant helpdesk email',
    },
    {
      key: 'support_phone',
      value: '+918000000000',
      description: 'Toll-free customer support helpline',
    },
    {
      key: 'default_delivery_fee',
      value: 29.0,
      description: 'Base delivery fee charged per single-store checkout',
    },
    {
      key: 'free_delivery_threshold',
      value: 499.0,
      description: 'Minimum order cart value for free delivery',
    },
  ];

  for (const s of settingsData) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }

  console.log('✅ Marvel’s Basket Development Seed successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
