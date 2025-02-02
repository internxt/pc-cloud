import { HandleHydrateService } from '@/apps/sync-engine/callbacks/handleHydrate.service';
import { QueueItem } from 'virtual-drive/dist';
import { drive } from '../drive';

export const handleHydrate = async (task: QueueItem) => {
  const service = new HandleHydrateService();
  return await service.run({ task, drive });
};
