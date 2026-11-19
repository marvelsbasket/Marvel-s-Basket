import { Test, TestingModule } from '@nestjs/testing';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';

describe('AddressesController', () => {
  let controller: AddressesController;
  let service: any;

  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockAddressId = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    service = {
      list: jest.fn().mockResolvedValue([{ id: mockAddressId, label: 'Home' }]),
      create: jest.fn().mockResolvedValue({ id: mockAddressId, label: 'Home' }),
      findById: jest.fn().mockResolvedValue({ id: mockAddressId, label: 'Home' }),
      update: jest.fn().mockResolvedValue({ id: mockAddressId, label: 'Work' }),
      delete: jest.fn().mockResolvedValue({ success: true }),
      setDefault: jest.fn().mockResolvedValue({ id: mockAddressId, isDefault: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [
        {
          provide: AddressesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<AddressesController>(AddressesController);
  });

  it('should call list', async () => {
    const res = await controller.listAddresses(mockUserId);
    expect(res).toEqual([{ id: mockAddressId, label: 'Home' }]);
    expect(service.list).toHaveBeenCalledWith(mockUserId);
  });

  it('should call create', async () => {
    const dto = {
      label: 'Home',
      recipientName: 'Rohan Sharma',
      phone: '9876543210',
      addressLine1: 'Civil Lines',
      city: 'Azamgarh',
      state: 'Uttar Pradesh',
      postalCode: '276001',
    };
    const res = await controller.createAddress(mockUserId, dto);
    expect(res).toEqual({ id: mockAddressId, label: 'Home' });
    expect(service.create).toHaveBeenCalledWith(mockUserId, dto);
  });

  it('should call getAddress', async () => {
    const res = await controller.getAddress(mockUserId, mockAddressId);
    expect(res).toEqual({ id: mockAddressId, label: 'Home' });
    expect(service.findById).toHaveBeenCalledWith(mockUserId, mockAddressId);
  });

  it('should call updateAddress', async () => {
    const res = await controller.updateAddress(mockUserId, mockAddressId, { label: 'Work' });
    expect(res).toEqual({ id: mockAddressId, label: 'Work' });
    expect(service.update).toHaveBeenCalledWith(mockUserId, mockAddressId, { label: 'Work' });
  });

  it('should call deleteAddress', async () => {
    const res = await controller.deleteAddress(mockUserId, mockAddressId);
    expect(res).toEqual({ success: true });
    expect(service.delete).toHaveBeenCalledWith(mockUserId, mockAddressId);
  });

  it('should call setDefaultAddress', async () => {
    const res = await controller.setDefaultAddress(mockUserId, mockAddressId);
    expect(res).toEqual({ id: mockAddressId, isDefault: true });
    expect(service.setDefault).toHaveBeenCalledWith(mockUserId, mockAddressId);
  });
});
