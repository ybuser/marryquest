import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { publicUrlForObjectKey } from '@/lib/storage/keys';
import type { StorageConfig } from '@/lib/storage/config';
import {
  PRESIGNED_UPLOAD_TTL_SECONDS,
  StorageError,
  type PresignedTemporaryPut,
  type StorageObjectHead,
  type StorageProvider,
  type TimelineImageContentType
} from '@/lib/storage/types';

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey'
  );
}

function toObjectHead(response: {
  ContentLength?: number;
  ContentType?: string;
  ETag?: string;
}): StorageObjectHead {
  if (!Number.isSafeInteger(response.ContentLength) || (response.ContentLength ?? -1) < 0) {
    throw new StorageError('STORAGE_OBJECT_INVALID');
  }
  return {
    contentLength: response.ContentLength as number,
    contentType: response.ContentType ?? null,
    eTag: response.ETag ?? null
  };
}

function destroyBody(body: unknown) {
  if (body && typeof body === 'object' && 'destroy' in body) {
    const destroy = (body as { destroy?: () => void }).destroy;
    if (typeof destroy === 'function') destroy.call(body);
  }
}

function chunkToBuffer(chunk: unknown): Buffer {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (chunk instanceof Uint8Array) return Buffer.from(chunk);
  if (typeof chunk === 'string') return Buffer.from(chunk);
  throw new StorageError('STORAGE_OBJECT_INVALID');
}

export class R2StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint.toString(),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      forcePathStyle: config.forcePathStyle,
      requestChecksumCalculation: 'WHEN_REQUIRED'
    });
  }

  async createPresignedTemporaryPut(
    key: string,
    contentType: TimelineImageContentType,
    expiresInSeconds = PRESIGNED_UPLOAD_TTL_SECONDS
  ): Promise<PresignedTemporaryPut> {
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.config.uploadBucket,
        Key: key,
        ContentType: contentType
      }),
      {
        expiresIn: expiresInSeconds,
        signableHeaders: new Set(['content-type'])
      }
    );

    return {
      uploadUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      headers: { 'Content-Type': contentType }
    };
  }

  async headTemporaryObject(key: string): Promise<StorageObjectHead | null> {
    return this.headObject(this.config.uploadBucket, key);
  }

  async headPublicObject(key: string): Promise<StorageObjectHead | null> {
    return this.headObject(this.config.publicBucket, key);
  }

  private async headObject(bucket: string, key: string): Promise<StorageObjectHead | null> {
    try {
      const response = await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return toObjectHead(response);
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw new StorageError('STORAGE_UNAVAILABLE');
    }
  }

  async readTemporaryObject(key: string, head: StorageObjectHead, maxBytes: number): Promise<Buffer> {
    if (head.contentLength < 1 || head.contentLength > maxBytes) {
      throw new StorageError('STORAGE_OBJECT_TOO_LARGE');
    }

    const abortController = new AbortController();
    let response;
    try {
      response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.uploadBucket,
          Key: key,
          IfMatch: head.eTag ?? undefined
        }),
        { abortSignal: abortController.signal }
      );
    } catch {
      throw new StorageError('STORAGE_UNAVAILABLE');
    }

    if (!response.Body || !Number.isSafeInteger(response.ContentLength)) {
      destroyBody(response.Body);
      throw new StorageError('STORAGE_OBJECT_INVALID');
    }
    if (response.ContentLength !== head.contentLength) {
      destroyBody(response.Body);
      throw new StorageError('STORAGE_OBJECT_LENGTH_MISMATCH');
    }

    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for await (const chunk of response.Body as AsyncIterable<unknown>) {
        const buffer = chunkToBuffer(chunk);
        total += buffer.length;
        if (total > maxBytes) {
          abortController.abort();
          destroyBody(response.Body);
          throw new StorageError('STORAGE_OBJECT_TOO_LARGE');
        }
        chunks.push(buffer);
      }
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('STORAGE_UNAVAILABLE');
    } finally {
      destroyBody(response.Body);
    }

    if (total !== head.contentLength) {
      throw new StorageError('STORAGE_OBJECT_LENGTH_MISMATCH');
    }
    return Buffer.concat(chunks, total);
  }

  async writePublicObject(key: string, body: Buffer): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.publicBucket,
          Key: key,
          Body: body,
          ContentLength: body.length,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable'
        })
      );
    } catch {
      throw new StorageError('STORAGE_UNAVAILABLE');
    }
  }

  async deleteTemporaryObject(key: string): Promise<void> {
    await this.deleteObject(this.config.uploadBucket, key);
  }

  private async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      throw new StorageError('STORAGE_UNAVAILABLE');
    }
  }

  publicUrlForKey(key: string): string {
    return publicUrlForObjectKey(this.config.publicBaseUrl, key);
  }

  async readiness(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.uploadBucket }));
    } catch {
      throw new StorageError('STORAGE_UPLOAD_BUCKET_UNAVAILABLE');
    }

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.publicBucket }));
    } catch {
      throw new StorageError('STORAGE_PUBLIC_BUCKET_UNAVAILABLE');
    }
  }
}
