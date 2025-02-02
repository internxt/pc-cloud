import { logger } from '@/apps/logger';
import { drive } from './drive';
import { settings } from './settings';
import { Callbacks, QueueHandler, QueueManager, VirtualDrive } from 'virtual-drive/dist';
import { initInfoItems } from './info-items-manager';
import { handleAdd } from './handlers/handle-add';
import { handleHydrate } from './handlers/handle-hydrate';
import { handleDehydrate } from './handlers/handle-dehydrate';
import { fetchDataCallback } from './callbacks/notify-fetch-data.callback';

const callbacks: Callbacks = {
  notifyDeleteCallback: () => undefined,
  notifyRenameCallback: () => undefined,
  fetchDataCallback,
  cancelFetchDataCallback: () => undefined,
  notifyMessageCallback: () => undefined,
};
const handlers: QueueHandler = { handleAdd, handleHydrate, handleDehydrate, handleChangeSize: async () => undefined };

const notify = { onTaskSuccess: async () => undefined, onTaskProcessing: async () => undefined };
const queueManager = new QueueManager(handlers, notify, settings.queuePersistPath);

drive.registerSyncRoot(settings.driveName, settings.driveVersion, settings.providerid, callbacks, settings.iconPath).then(() => {
  try {
    initInfoItems();
    drive.connectSyncRoot();
    drive.watchAndWait(settings.syncRootPath, queueManager, settings.watcherLogPath);
  } catch (error) {
    logger.error(error);
    drive.disconnectSyncRoot();
    VirtualDrive.unregisterSyncRoot(settings.syncRootPath);
  }
});
