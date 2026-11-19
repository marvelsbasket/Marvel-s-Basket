import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannel, UserRoleType, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockUser = {
    id: mockUserId,
    name: 'Rohan Sharma',
    email: 'rohan.sharma@example.com',
    phone: '9876543210',
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date('2026-01-01T10:00:00Z'),
    createdAt: new Date('2026-01-01T09:00:00Z'),
    lastLoginAt: new Date('2026-01-02T08:00:00Z'),
    deletedAt: null,
    customerProfile: {
      id: '22222222-2222-2222-2222-222222222222',
      userId: mockUserId,
      avatarUrl: 'https://example.com/avatar.jpg',
      dateOfBirth: new Date('1995-05-15'),
    },
    userRoles: [
      {
        role: {
          name: 'CUSTOMER',
          roleType: UserRoleType.CUSTOMER,
        },
      },
    ],
    _count: {
      addresses: 2,
    },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      customerProfile: {
        upsert: jest.fn(),
      },
      notificationPreference: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      session: {
        updateMany: jest.fn(),
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
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getMe', () => {
    it('should return the customer profile for an active user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.name).toBe('Rohan Sharma');
      expect(result.email).toBe('rohan.sharma@example.com');
      expect(result.isEmailVerified).toBe(true);
      expect(result.roles).toEqual(['CUSTOMER']);
      expect(result.dateOfBirth).toBe('1995-05-15');
    });

    it('should throw NotFoundException if user does not exist or is deleted', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe(mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMe', () => {
    it('should update name and profile avatarUrl / dateOfBirth', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, name: 'Rohan S.' });
      prisma.customerProfile.upsert.mockResolvedValue({
        ...mockUser.customerProfile,
        avatarUrl: 'https://example.com/new.jpg',
      });

      const result = await service.updateMe(mockUserId, {
        name: 'Rohan S.',
        avatarUrl: 'https://example.com/new.jpg',
      });

      expect(result.name).toBe('Rohan Sharma'); // from subsequent getMe with mockUser
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { name: 'Rohan S.' },
      });
      expect(prisma.customerProfile.upsert).toHaveBeenCalled();
    });

    it('should throw BadRequestException if account is suspended', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(service.updateMe(mockUserId, { name: 'New Name' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAccountOverview', () => {
    it('should return account metadata including address count', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getAccountOverview(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.totalAddresses).toBe(2);
      expect(result.isEmailVerified).toBe(true);
    });
  });

  describe('preferences', () => {
    it('should return notification preferences', async () => {
      prisma.notificationPreference.findMany.mockResolvedValue([
        { channel: NotificationChannel.EMAIL, isEnabled: true },
        { channel: NotificationChannel.SMS, isEnabled: false },
      ]);

      const result = await service.getPreferences(mockUserId);

      expect(result.emailNotifications).toBe(true);
      expect(result.smsNotifications).toBe(false);
      expect(result.pushNotifications).toBe(true); // default fallback
    });

    it('should update preferences using transaction', async () => {
      prisma.notificationPreference.findMany.mockResolvedValue([]);

      await service.updatePreferences(mockUserId, {
        emailNotifications: false,
        smsNotifications: true,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('deactivateAccount', () => {
    it('should mark account as INACTIVE and revoke sessions', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.deactivateAccount(mockUserId);

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { status: UserStatus.INACTIVE },
      });
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
