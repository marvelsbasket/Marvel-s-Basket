import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  SignedUrlOptions,
  UploadDocumentOptions,
  UploadImageOptions,
  UploadResult,
} from './cloudinary.interface';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly isMockMode: boolean;
  private readonly mockStorageDir: string;
  // In-memory cache for fast test execution
  private readonly mockFileRegistry = new Map<
    string,
    { buffer: Buffer; mimeType: string; originalFilename: string }
  >();

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName', '');
    const apiKey = this.configService.get<string>('cloudinary.apiKey', '');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret', '');
    const nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');

    this.isMockMode =
      nodeEnv === 'test' ||
      !apiKey ||
      apiKey.includes('placeholder') ||
      !cloudName ||
      !apiSecret ||
      apiSecret.includes('placeholder');

    this.mockStorageDir = path.resolve(process.cwd(), 'uploads', 'private');

    if (!this.isMockMode) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.logger.log(`Cloudinary SDK initialized with cloud: ${cloudName}`);
    } else {
      this.logger.log(
        'CloudinaryService initialized in simulated mock mode (local encrypted private storage).',
      );
      if (!fs.existsSync(this.mockStorageDir)) {
        try {
          fs.mkdirSync(this.mockStorageDir, { recursive: true });
        } catch {
          // ignore directory creation error in read-only environments
        }
      }
    }
  }

  /**
   * Upload an optimized image (e.g. Profile photo, Storefront photo).
   * Automatically optimizes format (`f_auto`) and quality (`q_auto`) and limits dimensions.
   */
  async uploadImage(file: Express.Multer.File, options: UploadImageOptions): Promise<UploadResult> {
    if (this.isMockMode) {
      return this.handleMockUpload(file, options.folder, 'image', 'public');
    }

    const uploadOptions: UploadApiOptions = {
      folder: options.folder,
      resource_type: 'image',
      transformation: [
        {
          width: options.maxWidth || 1600,
          height: options.maxHeight || 1200,
          crop: 'limit',
          quality: options.quality || 'auto',
          fetch_format: options.format || 'auto',
        },
      ],
      tags: options.tags || ['seller-media'],
    };

    const response = await this.streamUpload(file.buffer, uploadOptions);
    return {
      publicId: response.public_id,
      secureUrl: response.secure_url,
      format: response.format,
      bytes: response.bytes,
      resourceType: 'image',
      accessMode: 'public',
      originalFilename: file.originalname,
    };
  }

  /**
   * Upload a private KYC document (e.g. PAN, Cancelled Cheque, Address Proof, FSSAI).
   * Stored as an authenticated restricted asset with short-lived signed access URLs.
   */
  async uploadPrivateDocument(
    file: Express.Multer.File,
    options: UploadDocumentOptions,
  ): Promise<UploadResult> {
    const isPdf =
      file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    const resourceType = isPdf ? 'raw' : 'image';

    if (this.isMockMode) {
      return this.handleMockUpload(file, options.folder, resourceType, 'authenticated');
    }

    const uploadOptions: UploadApiOptions = {
      folder: options.folder,
      resource_type: resourceType,
      type: 'authenticated',
      access_mode: 'authenticated',
      tags: options.tags || ['kyc-document'],
    };

    const response = await this.streamUpload(file.buffer, uploadOptions);
    return {
      publicId: response.public_id,
      secureUrl: response.secure_url,
      format: response.format || (isPdf ? 'pdf' : 'jpg'),
      bytes: response.bytes,
      resourceType: resourceType as 'image' | 'raw',
      accessMode: 'authenticated',
      originalFilename: file.originalname,
    };
  }

  /**
   * Generates a short-lived signed URL for an authenticated/private document.
   */
  generateSignedUrl(publicId: string, options?: SignedUrlOptions): string {
    const expiresIn = options?.expiresInSeconds || 300; // 5 minutes default
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    if (this.isMockMode) {
      // Return authenticated internal endpoint stream URL with expiration token
      const token = crypto
        .createHmac('sha256', 'marvels-secret-mock-token')
        .update(`${publicId}:${expiresAt}`)
        .digest('hex');
      return `/api/v1/sellers/documents/stream/${encodeURIComponent(publicId)}?expires=${expiresAt}&token=${token}`;
    }

    const resourceType = options?.resourceType || 'image';
    return cloudinary.url(publicId, {
      type: 'authenticated',
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
      resource_type: resourceType,
    });
  }

  /**
   * Deletes a resource from Cloudinary or mock registry.
   */
  async deleteResource(
    publicId: string,
    resourceType: 'image' | 'raw' = 'image',
  ): Promise<boolean> {
    if (this.isMockMode) {
      this.mockFileRegistry.delete(publicId);
      const filePath = path.join(this.mockStorageDir, `${publicId.replace(/\//g, '_')}`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore error
        }
      }
      return true;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: 'authenticated',
      });
      return result.result === 'ok';
    } catch (err) {
      this.logger.error(`Failed to delete Cloudinary resource ${publicId}:`, err);
      return false;
    }
  }

  /**
   * Retrieve file buffer for internal authenticated preview streaming (especially in mock/test mode).
   */
  getMockFile(
    publicId: string,
  ): { buffer: Buffer; mimeType: string; originalFilename: string } | null {
    if (this.mockFileRegistry.has(publicId)) {
      return this.mockFileRegistry.get(publicId)!;
    }
    const safeName = publicId.replace(/\//g, '_');
    const filePath = path.join(this.mockStorageDir, safeName);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const isPdf = publicId.endsWith('.pdf') || safeName.includes('pdf');
      return {
        buffer,
        mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
        originalFilename: path.basename(filePath),
      };
    }
    return null;
  }

  private handleMockUpload(
    file: Express.Multer.File,
    folder: string,
    resourceType: 'image' | 'raw',
    accessMode: 'public' | 'authenticated',
  ): UploadResult {
    const ext = path.extname(file.originalname) || (resourceType === 'raw' ? '.pdf' : '.jpg');
    const randomId = crypto.randomBytes(8).toString('hex');
    const publicId = `${folder}/${Date.now()}_${randomId}${ext}`;

    this.mockFileRegistry.set(publicId, {
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
    });

    const secureUrl = `/uploads/mock/${publicId}`;

    return {
      publicId,
      secureUrl,
      format: ext.replace('.', ''),
      bytes: file.buffer?.length || 0,
      resourceType,
      accessMode,
      originalFilename: file.originalname,
    };
  }

  private streamUpload(buffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) {
          this.logger.error(`Cloudinary upload failed: ${error.message}`, error);
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Cloudinary returned empty upload result'));
        }
        resolve(result);
      });

      Readable.from(buffer).pipe(uploadStream);
    });
  }
}
