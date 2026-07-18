import { loadStorageConfig, type StorageConfig } from '@/lib/storage/config';
import { R2StorageProvider } from '@/lib/storage/r2';

export { loadStorageConfig } from '@/lib/storage/config';
export {
  buildFinalTimelineKey,
  buildTemporaryTimelineKey,
  isSafeStorageSegment,
  parseTemporaryTimelineKey
} from '@/lib/storage/keys';
export { createTimelineWebp } from '@/lib/storage/image';
export * from '@/lib/storage/types';

export function createStorageProvider(config: StorageConfig = loadStorageConfig()) {
  return new R2StorageProvider(config);
}
