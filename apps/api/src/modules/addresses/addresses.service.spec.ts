import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { AddressesService } from './addresses.service';

describe('AddressesService', () => {
  let service: AddressesService;
  let prisma: any;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockAddressId = '33333333-3333-3333-3333-333333333333';

  const mockAddress = {
    id: mockAddressId,
    userId: mockUserId,
    label: 'Home',
    recipientName: 'Rohan Sharma',
    phone: '9876543210',
    addressLine1: 'Flat 101, Green Heights',
    addressLine2: 'Civil Lines',
    landmark: 'Near City Mall',
    city: 'Azamgarh',
    state: 'Uttar Pradesh',
    postalCode: '276001',
    country: 'India',
    latitude: 26.0688,
    longitude: 83.1859,
    isDefault: true,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      customerAddress: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return cb(prisma);
        }
        return Promise.all(cb);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
  });

  describe('list', () => {
    it('should return addresses for the customer', async () => {
      prisma.customerAddress.findMany.mockResolvedValue([mockAddress]);

      const result = await service.list(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockAddressId);
      expect(result[0].recipientName).toBe('Rohan Sharma');
      expect(prisma.customerAddress.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('create', () => {
    it('should make the first created address default automatically', async () => {
      prisma.customerAddress.count.mockResolvedValue(0);
      prisma.customerAddress.create.mockResolvedValue(mockAddress);

      const result = await service.create(mockUserId, {
        label: 'Home',
        recipientName: 'Rohan Sharma',
        phone: '9876543210',
        addressLine1: 'Flat 101, Green Heights',
        city: 'Azamgarh',
        state: 'Uttar Pradesh',
        postalCode: '276001',
        isDefault: false,
      });

      expect(result.isDefault).toBe(true);
      expect(prisma.customerAddress.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          isDefault: true,
        }),
      });
    });

    it('should unset previous default when new address isDefault is true', async () => {
      prisma.customerAddress.count.mockResolvedValue(1);
      prisma.customerAddress.create.mockResolvedValue(mockAddress);

      await service.create(mockUserId, {
        label: 'Work',
        recipientName: 'Rohan Sharma',
        phone: '9876543210',
        addressLine1: 'Office 2, Tech Park',
        city: 'Azamgarh',
        state: 'Uttar Pradesh',
        postalCode: '276001',
        isDefault: true,
      });

      expect(prisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { isDefault: false },
      });
    });
  });

  describe('findById (Data Isolation)', () => {
    it('should return address when owned by customer', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(mockAddress);

      const result = await service.findById(mockUserId, mockAddressId);
      expect(result.id).toBe(mockAddressId);
      expect(prisma.customerAddress.findFirst).toHaveBeenCalledWith({
        where: { id: mockAddressId, userId: mockUserId },
      });
    });

    it('should throw NotFoundException if address belongs to another customer', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockUserId, 'another-users-address-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update address fields after verifying ownership', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(mockAddress);
      prisma.customerAddress.update.mockResolvedValue({
        ...mockAddress,
        recipientName: 'Rohan S.',
      });

      const result = await service.update(mockUserId, mockAddressId, {
        recipientName: 'Rohan S.',
      });

      expect(result.recipientName).toBe('Rohan S.');
      expect(prisma.customerAddress.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete address and promote remaining address to default if deleted was default', async () => {
      prisma.customerAddress.findFirst
        .mockResolvedValueOnce(mockAddress) // findById
        .mockResolvedValueOnce({ ...mockAddress, id: 'remaining-id', isDefault: false }); // nextAddress
      prisma.customerAddress.delete.mockResolvedValue(mockAddress);
      prisma.customerAddress.update.mockResolvedValue({});

      const result = await service.delete(mockUserId, mockAddressId);

      expect(result.success).toBe(true);
      expect(prisma.customerAddress.delete).toHaveBeenCalledWith({
        where: { id: mockAddressId },
      });
      expect(prisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'remaining-id' },
        data: { isDefault: true },
      });
    });
  });

  describe('setDefault', () => {
    it('should clear other defaults and set the chosen address to default', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(mockAddress);
      prisma.customerAddress.update.mockResolvedValue(mockAddress);

      const result = await service.setDefault(mockUserId, mockAddressId);

      expect(result.isDefault).toBe(true);
      expect(prisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { isDefault: false },
      });
      expect(prisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: mockAddressId },
        data: { isDefault: true },
      });
    });
  });
});
