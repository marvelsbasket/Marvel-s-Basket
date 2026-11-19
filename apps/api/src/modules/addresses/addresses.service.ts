import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CustomerAddress } from '@prisma/client';
import { CustomerAddressResponse } from '@marvels-basket/shared';
import { PrismaService } from '../../database/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private mapToResponse(address: CustomerAddress): CustomerAddressResponse {
    return {
      id: address.id,
      userId: address.userId,
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
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
   * Adds a new delivery address for the authenticated customer.
   * If this is the customer's first address or isDefault is true, marks it as default.
   */
  async create(userId: string, dto: CreateAddressDto): Promise<CustomerAddressResponse> {
    const existingCount = await this.prisma.customerAddress.count({
      where: { userId },
    });

    // First address is automatically the default
    const shouldBeDefault = existingCount === 0 || dto.isDefault === true;

    const created = await this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.customerAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          userId,
          label: dto.label,
          recipientName: dto.recipientName,
          phone: dto.phone,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2 ?? null,
          landmark: dto.landmark ?? null,
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

    this.logger.log(`Created delivery address ${created.id} for user ${userId}`);
    return this.mapToResponse(created);
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
          ...(dto.label !== undefined && { label: dto.label }),
          ...(dto.recipientName !== undefined && { recipientName: dto.recipientName }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
          ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 ?? null }),
          ...(dto.landmark !== undefined && { landmark: dto.landmark ?? null }),
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
