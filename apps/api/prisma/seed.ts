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

  // Business Hours for Store 2 (7 days a week)
  for (let day = 0; day <= 6; day++) {
    await prisma.sellerBusinessHours.upsert({
      where: {
        sellerId_dayOfWeek: {
          sellerId: store2.id,
          dayOfWeek: day,
        },
      },
      update: {},
      create: {
        sellerId: store2.id,
        dayOfWeek: day,
        openingTime: '08:00',
        closingTime: '21:30',
        isClosed: false,
      },
    });
  }

  // Service Area for Store 2 (560095 exclusive + 560034 + 560001 shared with Store 1)
  await prisma.sellerServiceArea.deleteMany({ where: { sellerId: store2.id } });
  await prisma.sellerServiceArea.createMany({
    data: [
      { sellerId: store2.id, postalCode: '560095', radiusKm: 5.0, isActive: true },
      { sellerId: store2.id, postalCode: '560034', radiusKm: 5.0, isActive: true },
      { sellerId: store2.id, postalCode: '560001', radiusKm: 8.0, isActive: true },
    ],
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
  // 3. Brands, Categories & Master Product Catalog
  // ============================================================================
  console.log('  -> Seeding Brands, Categories & Master Product Catalog...');

  // 3.1 Brands
  const brandsData = [
    { name: 'Amul', slug: 'amul', description: 'The Taste of India — dairy excellence since 1946' },
    {
      name: 'Aashirvaad',
      slug: 'aashirvaad',
      description: 'ITC staple grains, flours, and organic spices',
    },
    {
      name: 'Fortune',
      slug: 'fortune',
      description: 'Adani Wilmar premium edible oils, basmati rice, and soya',
    },
    {
      name: 'fresho!',
      slug: 'fresho',
      description: "Marvel's Basket handpicked fresh farm fruits & vegetables",
    },
    {
      name: 'bb Popular',
      slug: 'bb-popular',
      description: 'High-quality everyday grocery staples at best value',
    },
    { name: 'Safal', slug: 'safal', description: 'Mother Dairy frozen vegetables and fruit pulps' },
    {
      name: 'Britannia',
      slug: 'britannia',
      description: 'Good Day, NutriChoice, daily bread and dairy',
    },
    {
      name: 'Parle',
      slug: 'parle',
      description: "India's favorite biscuits and confectionery since 1929",
    },
    { name: 'Tata Tea', slug: 'tata-tea', description: 'Premium Indian blended CTC tea' },
    {
      name: 'Cadbury',
      slug: 'cadbury',
      description: 'Dairy Milk, Bournville, and celebratory confectionery',
    },
    {
      name: 'Dettol',
      slug: 'dettol',
      description: 'Reckitt trusted germ protection and hygiene essentials',
    },
  ];

  const brandMap = new Map<string, any>();
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { description: b.description, isActive: true },
      create: { name: b.name, slug: b.slug, description: b.description, isActive: true },
    });
    brandMap.set(b.slug, brand);
  }

  // 3.2 Hierarchical Categories (L1 Departments & L2 Subcategories)
  // L1: Fresh Produce
  const catFresh = await prisma.category.upsert({
    where: { slug: 'fresh-produce' },
    update: { name: 'Fresh Produce', displayOrder: 1, isActive: true },
    create: {
      name: 'Fresh Produce',
      slug: 'fresh-produce',
      description: 'Farm-fresh vegetables, seasonal fruits, and organic salad greens.',
      iconUrl:
        'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=200&q=80',
      displayOrder: 1,
      isActive: true,
      defaultGstRate: 0.0,
    },
  });

  const catVeg = await prisma.category.upsert({
    where: { slug: 'fresh-vegetables' },
    update: { parentId: catFresh.id, displayOrder: 1 },
    create: {
      name: 'Fresh Vegetables',
      slug: 'fresh-vegetables',
      parentId: catFresh.id,
      description: 'Daily fresh potatoes, onions, tomatoes, gourds, and leafy greens.',
      displayOrder: 1,
      isActive: true,
    },
  });

  const catFruits = await prisma.category.upsert({
    where: { slug: 'fresh-fruits' },
    update: { parentId: catFresh.id, displayOrder: 2 },
    create: {
      name: 'Fresh Fruits',
      slug: 'fresh-fruits',
      parentId: catFresh.id,
      description: 'Sweet apples, bananas, citrus oranges, papayas, and berries.',
      displayOrder: 2,
      isActive: true,
    },
  });

  // L1: Dairy & Bakery
  const catDairy = await prisma.category.upsert({
    where: { slug: 'dairy-bakery' },
    update: { name: 'Dairy & Bakery', displayOrder: 2, isActive: true },
    create: {
      name: 'Dairy & Bakery',
      slug: 'dairy-bakery',
      description: 'Pasteurized milk, fresh paneer, curd, butter, and bakery breads.',
      iconUrl:
        'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=200&q=80',
      displayOrder: 2,
      isActive: true,
      defaultGstRate: 5.0,
    },
  });

  const catMilk = await prisma.category.upsert({
    where: { slug: 'milk-cream' },
    update: { parentId: catDairy.id, displayOrder: 1 },
    create: {
      name: 'Milk & Cream',
      slug: 'milk-cream',
      parentId: catDairy.id,
      description: 'Full cream, toned, cow milk, and whipping cream.',
      displayOrder: 1,
      isActive: true,
    },
  });

  const catBread = await prisma.category.upsert({
    where: { slug: 'bread-buns' },
    update: { parentId: catDairy.id, displayOrder: 2 },
    create: {
      name: 'Bread & Bakery',
      slug: 'bread-buns',
      parentId: catDairy.id,
      description: 'Brown bread, multigrain loafs, pav buns, and sourdough.',
      displayOrder: 2,
      isActive: true,
    },
  });

  // L1: Groceries & Kitchen
  const catGroceries = await prisma.category.upsert({
    where: { slug: 'groceries-kitchen' },
    update: { name: 'Groceries & Kitchen', displayOrder: 3, isActive: true },
    create: {
      name: 'Groceries & Kitchen',
      slug: 'groceries-kitchen',
      description: 'Aata, basmati rice, dals, cooking oils, and authentic Indian spices.',
      iconUrl:
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=200&q=80',
      displayOrder: 3,
      isActive: true,
      defaultGstRate: 5.0,
    },
  });

  const catAttaRice = await prisma.category.upsert({
    where: { slug: 'atta-rice-dals' },
    update: { parentId: catGroceries.id, displayOrder: 1 },
    create: {
      name: 'Atta, Rice & Dals',
      slug: 'atta-rice-dals',
      parentId: catGroceries.id,
      description: 'Chakki fresh wheat atta, basmati rice, toor dal, and moong dal.',
      displayOrder: 1,
      isActive: true,
    },
  });

  const catOils = await prisma.category.upsert({
    where: { slug: 'edible-oils-ghee' },
    update: { parentId: catGroceries.id, displayOrder: 2 },
    create: {
      name: 'Edible Oils & Ghee',
      slug: 'edible-oils-ghee',
      parentId: catGroceries.id,
      description: 'Sunflower oil, mustard oil, groundnut oil, and pure desi ghee.',
      displayOrder: 2,
      isActive: true,
    },
  });

  // L1: Snacks & Drinks
  const catSnacks = await prisma.category.upsert({
    where: { slug: 'snacks-drinks' },
    update: { name: 'Snacks & Drinks', displayOrder: 4, isActive: true },
    create: {
      name: 'Snacks & Drinks',
      slug: 'snacks-drinks',
      description: 'Crispy namkeens, potato chips, biscuits, tea, and fruit juices.',
      iconUrl:
        'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=200&q=80',
      displayOrder: 4,
      isActive: true,
      defaultGstRate: 12.0,
    },
  });

  const catBiscuits = await prisma.category.upsert({
    where: { slug: 'biscuits-cookies' },
    update: { parentId: catSnacks.id, displayOrder: 1 },
    create: {
      name: 'Biscuits & Cookies',
      slug: 'biscuits-cookies',
      parentId: catSnacks.id,
      description: 'Glucose biscuits, butter cookies, cream biscuits, and rusks.',
      displayOrder: 1,
      isActive: true,
    },
  });

  const catJuices = await prisma.category.upsert({
    where: { slug: 'juices-cold-drinks' },
    update: { parentId: catSnacks.id, displayOrder: 2 },
    create: {
      name: 'Juices & Cold Drinks',
      slug: 'juices-cold-drinks',
      parentId: catSnacks.id,
      description: 'Natural fruit juices, tender coconut water, and sodas.',
      displayOrder: 2,
      isActive: true,
    },
  });

  // L1: Personal Care
  const catPersonal = await prisma.category.upsert({
    where: { slug: 'personal-care' },
    update: { name: 'Personal Care', displayOrder: 5, isActive: true },
    create: {
      name: 'Personal Care',
      slug: 'personal-care',
      description: 'Soaps, shampoos, oral hygiene, and skincare.',
      iconUrl:
        'https://images.unsplash.com/photo-1607006314592-3112b3f1f7ca?auto=format&fit=crop&w=200&q=80',
      displayOrder: 5,
      isActive: true,
      defaultGstRate: 18.0,
    },
  });

  const catBath = await prisma.category.upsert({
    where: { slug: 'bath-body-oral-care' },
    update: { parentId: catPersonal.id, displayOrder: 1 },
    create: {
      name: 'Bath, Body & Oral Care',
      slug: 'bath-body-oral-care',
      parentId: catPersonal.id,
      description: 'Bathing soaps, hand wash, toothpaste, and brushes.',
      displayOrder: 1,
      isActive: true,
    },
  });

  // 3.3 Master Products with Variants & Images
  interface MasterProductSeed {
    name: string;
    slug: string;
    brandSlug: string;
    categoryId: string;
    shortDesc: string;
    description: string;
    foodPref: any;
    countryOfOrigin: string;
    shelfLife: string;
    storage: string;
    tags: string[];
    isFeatured: boolean;
    variants: {
      name: string;
      packSize: string;
      unitVal: number;
      unitType: string;
      mrp: number;
      sku: string;
      img: string;
      // Store 1 (Indiranagar)
      store1Price: number;
      store1Stock: number;
      // Store 2 (Koramangala)
      store2Price: number;
      store2Stock: number;
    }[];
  }

  const catalogSeed: MasterProductSeed[] = [
    {
      name: 'Amul Taaza Homogenised Toned Milk',
      slug: 'amul-taaza-toned-milk',
      brandSlug: 'amul',
      categoryId: catMilk.id,
      shortDesc: 'Fresh pasteurized toned milk with 3.0% fat content.',
      description:
        'Amul Taaza is fresh toned milk with min 3.0% milk fat and min 8.5% milk SNF. Sterilized at ultra-high temperatures and aseptically packaged.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '180 Days (unopened)',
      storage: 'Store in a cool, dry place. Keep refrigerated once opened.',
      tags: ['milk', 'doodh', 'toned', 'taaza', 'amul', 'dairy'],
      isFeatured: true,
      variants: [
        {
          name: '500 ml',
          packSize: '500 ml - Pouch',
          unitVal: 500,
          unitType: 'ml',
          mrp: 33.0,
          sku: 'MB-AMUL-TAZA-500ML',
          img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
          store1Price: 33.0,
          store1Stock: 80,
          store2Price: 32.0,
          store2Stock: 60,
        },
        {
          name: '1 L',
          packSize: '1 L - Tetra Pak',
          unitVal: 1,
          unitType: 'L',
          mrp: 66.0,
          sku: 'MB-AMUL-TAZA-1L',
          img: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80',
          store1Price: 64.0,
          store1Stock: 45,
          store2Price: 63.0,
          store2Stock: 30,
        },
      ],
    },
    {
      name: 'fresho! Green Capsicum / Shimla Mirch',
      slug: 'fresho-green-capsicum',
      brandSlug: 'fresho',
      categoryId: catVeg.id,
      shortDesc: 'Crisp, crunchy, farm-fresh green bell peppers.',
      description:
        'Rich in Vitamin C and dietary fiber. Freshly harvested from local green farms and delivered within hours.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '4 Days refrigerated',
      storage: 'Keep in crisper drawer of refrigerator.',
      tags: ['capsicum', 'shimla mirch', 'green pepper', 'fresh', 'vegetable'],
      isFeatured: true,
      variants: [
        {
          name: '250 g',
          packSize: '250 g',
          unitVal: 250,
          unitType: 'g',
          mrp: 27.5,
          sku: 'MB-FRESHO-CAPS-250G',
          img: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80',
          store1Price: 18.0,
          store1Stock: 60,
          store2Price: 19.0,
          store2Stock: 40,
        },
        {
          name: '500 g',
          packSize: '500 g',
          unitVal: 500,
          unitType: 'g',
          mrp: 52.0,
          sku: 'MB-FRESHO-CAPS-500G',
          img: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80',
          store1Price: 35.0,
          store1Stock: 30,
          store2Price: 36.0,
          store2Stock: 25,
        },
      ],
    },
    {
      name: 'Aashirvaad Superior MP Sharbati Atta',
      slug: 'aashirvaad-sharbati-atta',
      brandSlug: 'aashirvaad',
      categoryId: catAttaRice.id,
      shortDesc: '100% whole wheat flour crafted from golden Sharbati grains.',
      description:
        'Aashirvaad Sharbati Atta is sourced directly from Madhya Pradesh farms. Makes soft rotis that stay fresh and fluffy longer.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '90 Days',
      storage: 'Store in an airtight container in a dry pantry.',
      tags: ['atta', 'flour', 'wheat', 'sharbati', 'aashirvaad', 'roti'],
      isFeatured: true,
      variants: [
        {
          name: '5 kg',
          packSize: '5 kg - Bag',
          unitVal: 5,
          unitType: 'kg',
          mrp: 310.0,
          sku: 'MB-AASH-ATTA-5KG',
          img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
          store1Price: 285.0,
          store1Stock: 50,
          store2Price: 280.0,
          store2Stock: 35,
        },
        {
          name: '10 kg',
          packSize: '10 kg - Bag',
          unitVal: 10,
          unitType: 'kg',
          mrp: 590.0,
          sku: 'MB-AASH-ATTA-10KG',
          img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
          store1Price: 549.0,
          store1Stock: 25,
          store2Price: 540.0,
          store2Stock: 20,
        },
      ],
    },
    {
      name: 'Fortune Sunlite Refined Sunflower Oil',
      slug: 'fortune-sunflower-oil',
      brandSlug: 'fortune',
      categoryId: catOils.id,
      shortDesc: 'Light and healthy refined sunflower oil enriched with vitamins.',
      description:
        'Fortified with Vitamins A and D. Low absorption technology ensures dishes remain crisp without greasy excess.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '270 Days',
      storage: 'Keep in a cool place away from direct sunlight.',
      tags: ['oil', 'tel', 'sunflower', 'cooking oil', 'fortune'],
      isFeatured: true,
      variants: [
        {
          name: '1 L',
          packSize: '1 L - Pouch',
          unitVal: 1,
          unitType: 'L',
          mrp: 165.0,
          sku: 'MB-FORT-SUN-1L',
          img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
          store1Price: 145.0,
          store1Stock: 65,
          store2Price: 142.0,
          store2Stock: 40,
        },
      ],
    },
    {
      name: 'Safal Frozen Tender Green Peas',
      slug: 'safal-frozen-green-peas',
      brandSlug: 'safal',
      categoryId: catVeg.id,
      shortDesc: 'Naturally sweet and tender green peas, IQF frozen at harvest.',
      description:
        'Safal green peas are picked at the peak of sweetness and individual quick frozen (IQF) to preserve natural sweetness and nutrients.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '365 Days frozen',
      storage: 'Keep frozen at -18°C.',
      tags: ['peas', 'frozen peas', 'matar', 'safal'],
      isFeatured: true,
      variants: [
        {
          name: '500 g',
          packSize: '500 g - Pouch',
          unitVal: 500,
          unitType: 'g',
          mrp: 135.0,
          sku: 'MB-SAFAL-PEAS-500G',
          img: 'https://images.unsplash.com/photo-1592394533824-9440e5d68530?auto=format&fit=crop&w=600&q=80',
          store1Price: 114.75,
          store1Stock: 70,
          store2Price: 115.0,
          store2Stock: 50,
        },
      ],
    },
    {
      name: 'Parle-G Gold Glucose Biscuits',
      slug: 'parle-g-gold-biscuits',
      brandSlug: 'parle',
      categoryId: catBiscuits.id,
      shortDesc: 'Bigger, crunchier, and more delicious iconic glucose biscuits.',
      description: 'The beloved tea-time companion. Made with milk, wheat, and glucose goodness.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '180 Days',
      storage: 'Store in a dry container once opened.',
      tags: ['parle-g', 'biscuit', 'cookies', 'chai', 'glucose'],
      isFeatured: true,
      variants: [
        {
          name: '187.5 g',
          packSize: '187.5 g',
          unitVal: 187.5,
          unitType: 'g',
          mrp: 30.0,
          sku: 'MB-PARLE-G-187G',
          img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80',
          store1Price: 30.0,
          store1Stock: 100,
          store2Price: 29.0,
          store2Stock: 80,
        },
      ],
    },
    {
      name: 'Real Activ 100% Orange Juice',
      slug: 'real-activ-orange-juice',
      brandSlug: 'real-activ',
      categoryId: catJuices.id,
      shortDesc: '100% pure orange juice with no added sugar or preservatives.',
      description:
        'Squeezed from sunny oranges to deliver natural Vitamin C and invigorating citrus flavor without artificial additives.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '240 Days',
      storage: 'Shake well before use. Refrigerate after opening.',
      tags: ['juice', 'orange', 'real activ', 'cold drink', 'breakfast'],
      isFeatured: true,
      variants: [
        {
          name: '1 L',
          packSize: '1 L - Tetra Pak',
          unitVal: 1,
          unitType: 'L',
          mrp: 160.0,
          sku: 'MB-REAL-ORANGE-1L',
          img: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
          store1Price: 140.8,
          store1Stock: 50,
          store2Price: 138.0,
          store2Stock: 35,
        },
      ],
    },
    {
      name: 'fresho! Royal Gala Apples',
      slug: 'fresho-royal-gala-apples',
      brandSlug: 'fresho',
      categoryId: catFruits.id,
      shortDesc: 'Crisp, sweet, aromatic imported Royal Gala apples.',
      description:
        'Naturally sweet with a fine texture. Perfect for healthy snacking, fruit salads, and juicing.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '7 Days refrigerated',
      storage: 'Keep in refrigerator crisper.',
      tags: ['apple', 'fruits', 'fresho', 'seb', 'healthy'],
      isFeatured: true,
      variants: [
        {
          name: '4 pcs',
          packSize: '4 pcs (~500-600g)',
          unitVal: 4,
          unitType: 'piece',
          mrp: 241.25,
          sku: 'MB-FRESHO-APPLE-4PC',
          img: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80',
          store1Price: 139.0,
          store1Stock: 40,
          store2Price: 145.0,
          store2Stock: 30,
        },
      ],
    },
    {
      name: 'The Health Factory Zero Maida Sourdough Bread',
      slug: 'health-factory-sourdough-bread',
      brandSlug: 'britannia',
      categoryId: catBread.id,
      shortDesc: 'Classic artisan sourdough crafted with 100% whole grains.',
      description:
        'Zero refined flour (maida). Naturally fermented with live starter culture for easy digestion and wholesome nutrition.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '5 Days',
      storage: 'Store in a cool dry place away from heat.',
      tags: ['bread', 'sourdough', 'bakery', 'zero maida', 'breakfast'],
      isFeatured: true,
      variants: [
        {
          name: '330 g',
          packSize: '330 g',
          unitVal: 330,
          unitType: 'g',
          mrp: 120.0,
          sku: 'MB-BREAD-SOUR-330G',
          img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
          store1Price: 60.0,
          store1Stock: 30,
          store2Price: 65.0,
          store2Stock: 20,
        },
      ],
    },
    {
      name: 'Dettol Original Germ Protection Bathing Soap',
      slug: 'dettol-original-bathing-soap',
      brandSlug: 'dettol',
      categoryId: catBath.id,
      shortDesc: 'Trusted antibacterial soap bar for 99.9% germ defense.',
      description:
        'Enriched with moisturizers to cleanse gently while delivering classic pine fragrance and hospital-grade protection.',
      foodPref: 'NA',
      countryOfOrigin: 'India',
      shelfLife: '730 Days',
      storage: 'Keep in a dry soap dish.',
      tags: ['dettol', 'soap', 'bath', 'personal care', 'hygiene'],
      isFeatured: false,
      variants: [
        {
          name: 'Pack of 4',
          packSize: '4 x 125 g',
          unitVal: 500,
          unitType: 'g',
          mrp: 220.0,
          sku: 'MB-DETTOL-SOAP-4X125',
          img: 'https://images.unsplash.com/photo-1607006314592-3112b3f1f7ca?auto=format&fit=crop&w=600&q=80',
          store1Price: 195.0,
          store1Stock: 45,
          store2Price: 190.0,
          store2Stock: 35,
        },
      ],
    },
    {
      name: 'bb Popular Fine White Sugar (Cheeni)',
      slug: 'bb-popular-fine-white-sugar',
      brandSlug: 'bb-popular',
      categoryId: catAttaRice.id,
      shortDesc: 'Sulphur-free pure crystalline white sugar for everyday kitchen use.',
      description:
        'Hygienically packed refined white sugar crystals ideal for daily tea, coffee, mithai, and baking.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '365 Days',
      storage: 'Store in an airtight container away from moisture.',
      tags: ['sugar', 'cheeni', 'chini', 'sweetener', 'grocery'],
      isFeatured: true,
      variants: [
        {
          name: '1 kg',
          packSize: '1 kg Pouch',
          unitVal: 1,
          unitType: 'kg',
          mrp: 58.0,
          sku: 'MB-SUGAR-1KG',
          img: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80',
          store1Price: 48.0,
          store1Stock: 3, // Low stock threshold test (< 5)
          store2Price: 51.0,
          store2Stock: 25,
        },
      ],
    },
    {
      name: 'Fresho Fresh Potato (Aloo)',
      slug: 'fresho-fresh-potato-aloo',
      brandSlug: 'fresho',
      categoryId: catVeg.id,
      shortDesc: 'Farm-fresh, hand-picked grade A table potatoes.',
      description:
        'Naturally grown potatoes ideal for curries, parathas, fries, and everyday Indian cooking.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '10 Days',
      storage: 'Keep in a cool, dark, ventilated basket.',
      tags: ['potato', 'aloo', 'alu', 'sabzi', 'vegetables'],
      isFeatured: true,
      variants: [
        {
          name: '1 kg',
          packSize: '1 kg',
          unitVal: 1,
          unitType: 'kg',
          mrp: 45.0,
          sku: 'MB-POTATO-1KG',
          img: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
          store1Price: 36.0,
          store1Stock: 40,
          store2Price: 38.0,
          store2Stock: 32,
        },
      ],
    },
    {
      name: 'Fresho Red Onion (Pyaz)',
      slug: 'fresho-red-onion-pyaz',
      brandSlug: 'fresho',
      categoryId: catVeg.id,
      shortDesc: 'Crisp, pungent red onions sourced directly from Nashik farms.',
      description:
        'Uniformly graded red onions adding rich aroma and base flavour to biryanis, dals, and salads.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '14 Days',
      storage: 'Store in a dry, breathable mesh bag.',
      tags: ['onion', 'pyaz', 'pyaaz', 'kanda', 'vegetables'],
      isFeatured: false,
      variants: [
        {
          name: '1 kg',
          packSize: '1 kg',
          unitVal: 1,
          unitType: 'kg',
          mrp: 60.0,
          sku: 'MB-ONION-1KG',
          img: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
          store1Price: 49.0,
          store1Stock: 50,
          store2Price: 47.0,
          store2Stock: 0, // Out of stock at Store 2 to test availability diff on store switch
        },
      ],
    },
    {
      name: 'Fresho Hybrid Tomato (Tamatar)',
      slug: 'fresho-hybrid-tomato-tamatar',
      brandSlug: 'fresho',
      categoryId: catVeg.id,
      shortDesc: 'Plump, glossy farm-fresh red hybrid tomatoes.',
      description:
        'Hand-sorted ripe hybrid tomatoes ideal for gravies, chutneys, soups, and fresh salads.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '5 Days',
      storage: 'Store at cool room temperature or refrigerate in crisper.',
      tags: ['tomato', 'tamatar', 'sabzi', 'vegetables'],
      isFeatured: false,
      variants: [
        {
          name: '500 g',
          packSize: '500 g',
          unitVal: 500,
          unitType: 'g',
          mrp: 35.0,
          sku: 'MB-TOMATO-500G',
          img: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=600&q=80',
          store1Price: 28.0,
          store1Stock: 24,
          store2Price: 26.0,
          store2Stock: 18,
        },
      ],
    },
    {
      name: 'Tata Tea Gold Leaf & Assam CTC Blend (Chai)',
      slug: 'tata-tea-gold-chai',
      brandSlug: 'tata-tea',
      categoryId: catSnacks.id,
      shortDesc: '15% gently rolled aromatic long leaves blended with strong Assam CTC.',
      description:
        'A rich, balanced Indian chai blend offering irresistible aroma and brisk cup strength.',
      foodPref: 'VEG',
      countryOfOrigin: 'India',
      shelfLife: '365 Days',
      storage: 'Store in a cool, dry airtight jar.',
      tags: ['tea', 'chai', 'patti', 'beverage', 'tata'],
      isFeatured: true,
      variants: [
        {
          name: '250 g',
          packSize: '250 g Pouch',
          unitVal: 250,
          unitType: 'g',
          mrp: 165.0,
          sku: 'MB-TATATEA-GOLD-250G',
          img: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&w=600&q=80',
          store1Price: 148.0,
          store1Stock: 22,
          store2Price: 152.0,
          store2Stock: 16,
        },
      ],
    },
  ];

  // Helper to upsert master product, variants, and store inventory
  for (const item of catalogSeed) {
    const brand = brandMap.get(item.brandSlug);

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        categoryId: item.categoryId,
        brandId: brand ? brand.id : null,
        brand: brand ? brand.name : item.name.split(' ')[0],
        shortDescription: item.shortDesc,
        description: item.description,
        foodPreference: item.foodPref,
        countryOfOrigin: item.countryOfOrigin,
        shelfLife: item.shelfLife,
        storageInstructions: item.storage,
        searchTags: item.tags,
        isFeatured: item.isFeatured,
        status: ProductStatus.ACTIVE,
      },
      create: {
        name: item.name,
        slug: item.slug,
        categoryId: item.categoryId,
        brandId: brand ? brand.id : null,
        brand: brand ? brand.name : item.name.split(' ')[0],
        shortDescription: item.shortDesc,
        description: item.description,
        foodPreference: item.foodPref,
        countryOfOrigin: item.countryOfOrigin,
        shelfLife: item.shelfLife,
        storageInstructions: item.storage,
        searchTags: item.tags,
        isFeatured: item.isFeatured,
        status: ProductStatus.ACTIVE,
      },
    });

    for (let i = 0; i < item.variants.length; i++) {
      const v = item.variants[i];

      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          name: v.name,
          packSize: v.packSize,
          unitValue: v.unitVal,
          unitType: v.unitType,
          mrp: v.mrp,
          primaryImageUrl: v.img,
          displayOrder: i,
          isActive: true,
        },
        create: {
          productId: product.id,
          name: v.name,
          packSize: v.packSize,
          unitValue: v.unitVal,
          unitType: v.unitType,
          mrp: v.mrp,
          sku: v.sku,
          primaryImageUrl: v.img,
          displayOrder: i,
          isActive: true,
        },
      });

      // Also upsert a product image record for this variant
      const existingImg = await prisma.productImage.findFirst({
        where: { variantId: variant.id },
      });
      if (!existingImg) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            variantId: variant.id,
            imageUrl: v.img,
            isPrimary: true,
            displayOrder: 0,
            altText: `${item.name} - ${v.name}`,
          },
        });
      }

      // Store 1 Listing (Indiranagar)
      let store1Listing = await prisma.sellerProduct.findFirst({
        where: {
          sellerId: store1.id,
          productId: product.id,
          variantId: variant.id,
        },
      });

      if (store1Listing) {
        store1Listing = await prisma.sellerProduct.update({
          where: { id: store1Listing.id },
          data: {
            sellingPrice: v.store1Price,
            mrp: v.mrp,
            sellerSku: `IND-${v.sku}`,
            status: SellerProductStatus.ACTIVE,
          },
        });
      } else {
        store1Listing = await prisma.sellerProduct.create({
          data: {
            sellerId: store1.id,
            productId: product.id,
            variantId: variant.id,
            sellingPrice: v.store1Price,
            mrp: v.mrp,
            sellerSku: `IND-${v.sku}`,
            status: SellerProductStatus.ACTIVE,
          },
        });
      }

      await prisma.inventory.upsert({
        where: { sellerProductId: store1Listing.id },
        update: {
          stockOnHand: v.store1Stock,
          availableQuantity: v.store1Stock,
          reservedQuantity: 0,
          lowStockThreshold: 5,
        },
        create: {
          sellerProductId: store1Listing.id,
          stockOnHand: v.store1Stock,
          availableQuantity: v.store1Stock,
          reservedQuantity: 0,
          lowStockThreshold: 5,
        },
      });

      // Store 2 Listing (Koramangala) - showcasing distinct selling prices & stock
      let store2Listing = await prisma.sellerProduct.findFirst({
        where: {
          sellerId: store2.id,
          productId: product.id,
          variantId: variant.id,
        },
      });

      if (store2Listing) {
        store2Listing = await prisma.sellerProduct.update({
          where: { id: store2Listing.id },
          data: {
            sellingPrice: v.store2Price,
            mrp: v.mrp,
            sellerSku: `KOR-${v.sku}`,
            status: SellerProductStatus.ACTIVE,
          },
        });
      } else {
        store2Listing = await prisma.sellerProduct.create({
          data: {
            sellerId: store2.id,
            productId: product.id,
            variantId: variant.id,
            sellingPrice: v.store2Price,
            mrp: v.mrp,
            sellerSku: `KOR-${v.sku}`,
            status: SellerProductStatus.ACTIVE,
          },
        });
      }

      await prisma.inventory.upsert({
        where: { sellerProductId: store2Listing.id },
        update: {
          stockOnHand: v.store2Stock,
          availableQuantity: v.store2Stock,
          reservedQuantity: 0,
          lowStockThreshold: 5,
        },
        create: {
          sellerProductId: store2Listing.id,
          stockOnHand: v.store2Stock,
          availableQuantity: v.store2Stock,
          reservedQuantity: 0,
          lowStockThreshold: 5,
        },
      });
    }
  }

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
        categoryId: catGroceries.id,
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
        categoryId: catSnacks.id,
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
