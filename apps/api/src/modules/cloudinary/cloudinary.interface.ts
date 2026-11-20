export interface UploadImageOptions {
  folder: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: string | number;
  format?: string;
  tags?: string[];
}

export interface UploadDocumentOptions {
  folder: string;
  tags?: string[];
  accessMode?: 'authenticated' | 'private';
}

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  bytes: number;
  resourceType: 'image' | 'raw' | 'auto';
  accessMode: 'public' | 'authenticated';
  originalFilename?: string;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
  resourceType?: 'image' | 'raw';
}
