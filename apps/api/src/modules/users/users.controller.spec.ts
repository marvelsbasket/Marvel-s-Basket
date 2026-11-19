import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: any;

  const mockUserId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    service = {
      getMe: jest.fn().mockResolvedValue({ userId: mockUserId, name: 'Rohan Sharma' }),
      updateMe: jest.fn().mockResolvedValue({ userId: mockUserId, name: 'Rohan Updated' }),
      getAccountOverview: jest.fn().mockResolvedValue({ userId: mockUserId, status: 'ACTIVE' }),
      getPreferences: jest.fn().mockResolvedValue({ emailNotifications: true }),
      updatePreferences: jest.fn().mockResolvedValue({ emailNotifications: false }),
      deactivateAccount: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should call getMe on getProfile', async () => {
    const res = await controller.getProfile(mockUserId);
    expect(res).toEqual({ userId: mockUserId, name: 'Rohan Sharma' });
    expect(service.getMe).toHaveBeenCalledWith(mockUserId);
  });

  it('should call updateMe on updateProfile', async () => {
    const res = await controller.updateProfile(mockUserId, { name: 'Rohan Updated' });
    expect(res).toEqual({ userId: mockUserId, name: 'Rohan Updated' });
    expect(service.updateMe).toHaveBeenCalledWith(mockUserId, { name: 'Rohan Updated' });
  });

  it('should call getAccountOverview', async () => {
    const res = await controller.getAccountOverview(mockUserId);
    expect(res).toEqual({ userId: mockUserId, status: 'ACTIVE' });
  });

  it('should call getPreferences and updatePreferences', async () => {
    const getRes = await controller.getPreferences(mockUserId);
    expect(getRes).toEqual({ emailNotifications: true });

    const patchRes = await controller.updatePreferences(mockUserId, { emailNotifications: false });
    expect(patchRes).toEqual({ emailNotifications: false });
  });

  it('should call deactivateAccount', async () => {
    const res = await controller.deactivateAccount(mockUserId);
    expect(res).toEqual({ success: true });
  });
});
