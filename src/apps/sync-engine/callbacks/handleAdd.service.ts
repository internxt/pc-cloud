import { QueueItem, VirtualDrive } from 'virtual-drive/dist';
import * as Sentry from '@sentry/electron/renderer';
import { BindingsManager } from '../BindingManager';
import Logger from 'electron-log';
import { isTemporaryFile } from '@/apps/utils/isTemporalFile';

type TProps = {
  self: BindingsManager;
  task: QueueItem; 
  drive: VirtualDrive;
};

export class HandleAddService {
  async run({ self, task, drive }: TProps) {
    try {
      Logger.debug('Path received from handle add', task.path);

      const tempFile = await isTemporaryFile(task.path);

      Logger.debug('[isTemporaryFile]', tempFile);

      if (tempFile && !task.isFolder) {
        Logger.debug('File is temporary, skipping');
        return;
      }

      const itemId = await self.controllers.addFile.execute(task.path);
      if (!itemId) {
        Logger.error('Error adding file' + task.path);
        return;
      }

      drive.convertToPlaceholder(task.path, itemId);
    } catch (error) {
      Logger.error(`error adding file ${task.path}`);
      Logger.error(error);
      Sentry.captureException(error);
    }
  }
}
