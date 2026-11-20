import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'app.nodeEnv') return 'test';
              if (key === 'cloudinary.cloudName') return 'mock-cloud';
              if (key === 'cloudinary.apiKey') return 'mock-key';
              if (key === 'cloudinary.apiSecret') return 'mock-secret';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  it('should be defined and initialize in mock mode during tests', () => {
    expect(service).toBeDefined();
  });

  it('should upload mock image with optimization metadata', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'storefront.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('fake-image-bytes'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const result = await service.uploadImage(mockFile, {
      folder: 'marvels-basket/sellers/store-images',
      maxWidth: 1600,
      maxHeight: 1200,
    });

    expect(result.publicId).toContain('marvels-basket/sellers/store-images');
    expect(result.resourceType).toBe('image');
    expect(result.accessMode).toBe('public');
  });

  it('should upload mock private KYC document and generate signed URL', async () => {
    const mockPdf: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'pan-card.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 2048,
      buffer: Buffer.from('fake-pdf-bytes'),
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const result = await service.uploadPrivateDocument(mockPdf, {
      folder: 'marvels-basket/sellers/kyc/pan',
    });

    expect(result.publicId).toContain('marvels-basket/sellers/kyc/pan');
    expect(result.resourceType).toBe('raw');
    expect(result.accessMode).toBe('authenticated');

    const signedUrl = service.generateSignedUrl(result.publicId, {
      expiresInSeconds: 300,
      resourceType: 'raw',
    });
    expect(signedUrl).toContain('/api/v1/sellers/documents/stream/');
    expect(signedUrl).toContain('expires=');
  });

  it('should delete a resource correctly', async () => {
    const deleted = await service.deleteResource('some/mock/public/id');
    expect(deleted).toBe(true);
  });
});
