import { v4 } from 'uuid';
import { QueueItem } from 'virtual-drive/dist';
import { addInfoItem } from '../info-items-manager';
import { drive } from '../drive';
import { HandleAddService } from '@/apps/sync-engine/callbacks/handleAdd.service';
import { BindingsManager } from '@/apps/sync-engine/BindingManager';

export const handleAdd = async (task: QueueItem) => {
  const self = {
    controllers: {
      addFile: {
        execute: async (path: string) => {
          const id = task.isFolder ? `FILE:${v4()}` : addInfoItem(path);
          return id;
        },
      },
    },
  } as unknown as BindingsManager;
  const service = new HandleAddService();
  return await service.run({ self, task, drive });
};
