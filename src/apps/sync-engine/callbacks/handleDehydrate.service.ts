import * as Sentry from '@sentry/electron/renderer';
import { QueueItem, VirtualDrive } from 'virtual-drive/dist';
import { logger } from '../../logger';

type TProps = {
  drive: VirtualDrive;
  task: QueueItem;
};

export class HandleDehydrateService {
  async run({ drive, task }: TProps) {
    try {
      logger.debug({ fn: 'handleDehydrate', task });
      drive.dehydrateFile(task.path);
    } catch (error) {
      logger.error({ fn: 'handleDehydrate', task, error });
      Sentry.captureException(error);
    }
  }
}
