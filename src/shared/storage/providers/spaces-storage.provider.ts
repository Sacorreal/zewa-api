import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  type ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { StorageProvider } from '../contracts/storage-provider';
import type {
  FileVisibility,
  PutObjectInput,
  StorageOptions,
} from '../contracts/storage.types';
import { SPACES_CLIENT, STORAGE_OPTIONS } from '../storage.tokens';

const ACL_BY_VISIBILITY: Record<FileVisibility, ObjectCannedACL> = {
  public: 'public-read',
  private: 'private',
};

const HTTP_NOT_FOUND = 404;

function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, $metadata } = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return name === 'NotFound' || $metadata?.httpStatusCode === HTTP_NOT_FOUND;
}

export function createSpacesClient(options: StorageOptions): S3Client {
  return new S3Client({
    endpoint: options.endpoint,
    region: options.region,
    forcePathStyle: false,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });
}

/** Implementación de `StorageProvider` sobre DigitalOcean Spaces (API S3). */
@Injectable()
export class SpacesStorageProvider extends StorageProvider {
  constructor(
    @Inject(SPACES_CLIENT) private readonly client: S3Client,
    @Inject(STORAGE_OPTIONS) private readonly options: StorageOptions,
  ) {
    super();
  }

  async putObject({
    key,
    body,
    contentType,
    visibility,
  }: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: ACL_BY_VISIBILITY[visibility],
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }),
    );
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw error;
    }
  }

  getSignedReadUrl(key: string, ttlSeconds: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
      { expiresIn: ttlSeconds },
    );
  }

  getPublicUrl(key: string): string {
    return `${this.options.publicBaseUrl}/${key}`;
  }
}
