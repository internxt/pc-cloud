import { BindingsManager } from '@/apps/sync-engine/BindingManager';
import { FetchDataService } from '@/apps/sync-engine/callbacks/fetchData.service';
import { SyncEngineIpc } from '@/apps/sync-engine/ipcRendererSyncEngine';
import { File } from '@/context/virtual-drive/files/domain/File';
import { FileStatuses } from '@/context/virtual-drive/files/domain/FileStatus';
import { FilePlaceholderId } from '@/context/virtual-drive/files/domain/PlaceholderId';
import { getInfoItem } from 'examples/info-items-manager';
import { v4 } from 'uuid';

type TCallback = (data: boolean, path: string, errorHandler?: () => void) => Promise<{ finished: boolean; progress: number }>;

export const fetchDataCallback = async (id: FilePlaceholderId, callback: TCallback) => {
  const service = new FetchDataService();

  const ipcRendererSyncEngine = { send: () => undefined } as unknown as SyncEngineIpc;
  const self = {
    progressBar: 0,
    controllers: {
      downloadFile: {
        fileFinderByContentsId: () => {
          return File.from({
            contentsId: '012345678901234567890123',
            createdAt: '',
            folderId: 0,
            id: 0,
            modificationTime: '',
            path: '/Users/user/Documents/internxt',
            size: 0,
            status: FileStatuses.EXISTS,
            updatedAt: '',
            uuid: v4(),
          });
        },
        execute: async () => {
          const path = getInfoItem(id);
          return path;
        },
      },
    },
  } as unknown as BindingsManager;

  return await service.run({ callback, contentsId: id, ipcRendererSyncEngine, self });
};
