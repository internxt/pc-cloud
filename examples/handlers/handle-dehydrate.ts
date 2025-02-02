import { HandleDehydrateService } from '@/apps/sync-engine/callbacks/handleDehydrate.service';
import { QueueItem } from 'virtual-drive/dist';
import { drive } from '../drive';

export const handleDehydrate = async (task: QueueItem) => {
  const service = new HandleDehydrateService();
  return await service.run({ task, drive });
};
