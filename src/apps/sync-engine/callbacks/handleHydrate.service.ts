import * as Sentry from '@sentry/electron/renderer';
import { QueueItem, VirtualDrive } from 'virtual-drive/dist';
import { logger } from '../../logger';

type TProps = {
  drive: VirtualDrive;
  task: QueueItem;
};

export class HandleHydrateService {
  async run({ drive, task }: TProps) {
    try {
      logger.debug({ fn: 'handleHydrate', task });
      await drive.hydrateFile(task.path);
    } catch (error) {
      logger.error({ fn: 'handleHydrate', task, error });
      Sentry.captureException(error);
    }
  }
}
