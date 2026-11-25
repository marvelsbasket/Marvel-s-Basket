import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AddressType, CustomerAddress } from '@prisma/client';
import { CustomerAddressResponse } from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private inferAddressType(dto: { addressType?: AddressType; label?: string }): AddressType {
    if (dto.addressType) return dto.addressType;
    const normalized = (dto.label || '').trim().toLowerCase();
    if (normalized === 'home') return AddressType.HOME;
    if (normalized === 'office' || normalized === 'work') return AddressType.OFFICE;
    return AddressType.OTHER;
  }

  private mapToResponse(address: CustomerAddress): CustomerAddressResponse {
    return {
      id: address.id,
      userId: address.userId,
      addressType: address.addressType,
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      forSomeoneElse: address.forSomeoneElse,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      locality: address.locality,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      latitude: address.latitude ? Number(address.latitude) : null,
      longitude: address.longitude ? Number(address.longitude) : null,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }

  /**
   * Lists all saved delivery addresses for the authenticated customer.
   * Default address is returned first, followed by newest addresses.
   */
  async list(userId: string): Promise<CustomerAddressResponse[]> {
    const addresses = await this.prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses.map((addr) => this.mapToResponse(addr));
  }

  /**
   * Adds a new delivery address for the authenticated customer (or updates matching record to avoid duplicates).
   * If this is the customer's first address or isDefault is true, marks it as default transactionally.
   */
  async create(userId: string, dto: CreateAddressDto): Promise<CustomerAddressResponse> {
    const existingCount = await this.prisma.customerAddress.count({
      where: { userId },
    });

    // Deduplicate identical house/postal/city addresses saved by the same customer
    const duplicate = await this.prisma.customerAddress.findFirst({
      where: {
        userId,
        postalCode: dto.postalCode,
        addressLine1: { equals: dto.addressLine1, mode: 'insensitive' },
        city: { equals: dto.city, mode: 'insensitive' },
      },
    });

    // First address is automatically the default
    const shouldBeDefault = existingCount === 0 || dto.isDefault === true;
    const resolvedType = this.inferAddressType(dto);

    const saved = await this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.customerAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      if (duplicate) {
        return tx.customerAddress.update({
          where: { id: duplicate.id },
          data: {
            addressType: resolvedType,
            label: dto.label,
            recipientName: dto.recipientName,
            phone: dto.phone,
            forSomeoneElse: dto.forSomeoneElse ?? false,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2 ?? duplicate.addressLine2,
            landmark: dto.landmark ?? duplicate.landmark,
            locality: dto.locality ?? duplicate.locality,
            city: dto.city,
            state: dto.state,
            postalCode: dto.postalCode,
            country: dto.country ?? 'India',
            latitude: dto.latitude ?? duplicate.latitude,
            longitude: dto.longitude ?? duplicate.longitude,
            isDefault: shouldBeDefault ? true : duplicate.isDefault,
          },
        });
      }

      return tx.customerAddress.create({
        data: {
          userId,
          addressType: resolvedType,
          label: dto.label,
          recipientName: dto.recipientName,
          phone: dto.phone,
          forSomeoneElse: dto.forSomeoneElse ?? false,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2 ?? null,
          landmark: dto.landmark ?? null,
          locality: dto.locality ?? null,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country ?? 'India',
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          isDefault: shouldBeDefault,
        },
      });
    });

    this.logger.log(
      `${duplicate ? 'Updated existing' : 'Created'} delivery address ${saved.id} for user ${userId}`,
    );
    return this.mapToResponse(saved);
  }

  /**
   * Retrieves a single delivery address by ID.
   * Strictly enforces customer ownership; throws NotFoundException if not owned.
   */
  async findById(userId: string, addressId: string): Promise<CustomerAddressResponse> {
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Delivery address not found');
    }

    return this.mapToResponse(address);
  }

  /**
   * Updates an existing delivery address.
   * Enforces customer ownership and atomic default address status.
   */
  async update(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<CustomerAddressResponse> {
    // Verify ownership
    await this.findById(userId, addressId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.customerAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          ...(dto.addressType !== undefined && { addressType: dto.addressType }),
          ...(dto.label !== undefined && { label: dto.label }),
          ...(dto.recipientName !== undefined && { recipientName: dto.recipientName }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.forSomeoneElse !== undefined && { forSomeoneElse: dto.forSomeoneElse }),
          ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
          ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 ?? null }),
          ...(dto.landmark !== undefined && { landmark: dto.landmark ?? null }),
          ...(dto.locality !== undefined && { locality: dto.locality ?? null }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.state !== undefined && { state: dto.state }),
          ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
          ...(dto.country !== undefined && { country: dto.country }),
          ...(dto.latitude !== undefined && { latitude: dto.latitude ?? null }),
          ...(dto.longitude !== undefined && { longitude: dto.longitude ?? null }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        },
      });
    });

    this.logger.log(`Updated address ${addressId} for user ${userId}`);
    return this.mapToResponse(updated);
  }

  /**
   * Deletes a delivery address.
   * If the deleted address was the default, automatically promotes the most recent remaining address to default.
   */
  async delete(userId: string, addressId: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.findById(userId, addressId);

    await this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.delete({
        where: { id: addressId },
      });

      // If deleted address was default, promote another remaining address if one exists
      if (existing.isDefault) {
        const nextAddress = await tx.customerAddress.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
        });

        if (nextAddress) {
          await tx.customerAddress.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }
    });

    this.logger.log(`Deleted delivery address ${addressId} for user ${userId}`);
    return {
      success: true,
      message: 'Delivery address deleted successfully',
    };
  }

  /**
   * Sets the specified address as the customer's default delivery address.
   */
  async setDefault(userId: string, addressId: string): Promise<CustomerAddressResponse> {
    // Verify ownership
    await this.findById(userId, addressId);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      return tx.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });

    this.logger.log(`Set address ${addressId} as default for user ${userId}`);
    return this.mapToResponse(updated);
  }
}
