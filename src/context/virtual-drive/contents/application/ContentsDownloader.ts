import Logger from 'electron-log';
import path from 'path';
import { ensureFolderExists } from '../../../../apps/shared/fs/ensure-folder-exists';
import { SyncEngineIpc } from '../../../../apps/sync-engine/SyncEngineIpc';
import { File } from '../../files/domain/File';
import { EventBus } from '../../shared/domain/EventBus';
import { ContentsManagersFactory } from '../domain/ContentsManagersFactory';
import { LocalFileContents } from '../domain/LocalFileContents';
import { ContentFileDownloader } from '../domain/contentHandlers/ContentFileDownloader';
import { LocalFileSystem } from '../domain/LocalFileSystem';
import { LocalFileContentsDirectoryProvider } from '../../shared/domain/LocalFileContentsDirectoryProvider';
import { DriveDesktopError } from '../../../shared/domain/errors/DriveDesktopError';
import fs from 'fs';

export class ContentsDownloader {
  constructor(
    private readonly managerFactory: ContentsManagersFactory,
    private readonly localFileSystem: LocalFileSystem,
    private readonly ipc: SyncEngineIpc,
    private readonly localFileContentsDirectoryProvider: LocalFileContentsDirectoryProvider,
    private readonly eventBus: EventBus
  ) {}

  private async registerEvents(downloader: ContentFileDownloader, file: File) {
    const location = await this.localFileContentsDirectoryProvider.provide();
    const folderPath = path.join(location, 'internxt');
    ensureFolderExists(folderPath);
    const filePath = path.join(folderPath, file.nameWithExtension);

    downloader.on('start', () => {
      this.ipc.send('FILE_DOWNLOADING', {
        name: file.name,
        extension: file.type,
        nameWithExtension: file.nameWithExtension,
        size: file.size,
        processInfo: { elapsedTime: downloader.elapsedTime() },
      });
    });

    downloader.on('progress', async () => {
      Logger.debug('[Server] Download progress', filePath);

      const stats = fs.statSync(filePath);
      const fileSizeInBytes = stats.size;
      const progress = fileSizeInBytes / file.size;

      this.ipc.send('FILE_DOWNLOADING', {
        name: file.name,
        extension: file.type,
        nameWithExtension: file.nameWithExtension,
        size: file.size,
        processInfo: {
          elapsedTime: downloader.elapsedTime(),
          progress,
        },
      });
    });

    downloader.on('error', (error: Error) => {
      const cause =
        error instanceof DriveDesktopError ? error.syncErrorCause : 'UNKNOWN';

      this.ipc.send('FILE_DOWNLOAD_ERROR', {
        name: file.name,
        extension: file.type,
        nameWithExtension: file.nameWithExtension,
        cause,
      });
    });

    downloader.on('finish', () => {
      // cb(true, filePath);
      // The file download being finished does not mean it has been hidratated
      // The file download being finished does not mean it has been hydrated
      // TODO: We might want to track this time instead of the whole completion time
    });
  }

  async run(file: File): Promise<string> {
    const downloader = this.managerFactory.downloader();

    await this.registerEvents(downloader, file);

    const readable = await downloader.download(file);

    const localContents = LocalFileContents.downloadedFrom(
      file,
      readable,
      downloader.elapsedTime()
    );

    const write = await this.localFileSystem.write(localContents);

    const events = localContents.pullDomainEvents();
    await this.eventBus.publish(events);

    this.ipc.send('FILE_DOWNLOADED', {
      name: file.name,
      extension: file.type,
      nameWithExtension: file.nameWithExtension,
      size: file.size,
      processInfo: { elapsedTime: downloader.elapsedTime() },
    });

    return write;
  }
}
