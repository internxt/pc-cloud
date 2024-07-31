import Logger from 'electron-log';
import * as fs from 'fs';
import { VirtualDrive, QueueItem } from 'virtual-drive/dist';
import { FilePlaceholderId } from '../../context/virtual-drive/files/domain/PlaceholderId';
import { PlatformPathConverter } from '../../context/virtual-drive/shared/application/PlatformPathConverter';
import {
  IControllers,
  buildControllers,
} from './callbacks-controllers/buildControllers';
import { executeControllerWithFallback } from './callbacks-controllers/middlewares/executeControllerWithFallback';
import { DependencyContainer } from './dependency-injection/DependencyContainer';
import { ipcRendererSyncEngine } from './ipcRendererSyncEngine';
import { ProcessIssue } from '../shared/types';
import { ipcRenderer } from 'electron';
import { ServerFileStatus } from '../../context/shared/domain/ServerFile';
import { ServerFolderStatus } from '../../context/shared/domain/ServerFolder';
// import * as Sentry from '@sentry/electron/renderer';
import { runner } from '../utils/runner';
import { QueueManager } from './dependency-injection/common/QueueManager';
import { DependencyInjectionLogWatcherPath } from './dependency-injection/common/logEnginePath';

export type CallbackDownload = (
  success: boolean,
  filePath: string
) => Promise<{ finished: boolean; progress: number }>;

export type FileAddedCallback = (
  acknowledge: boolean,
  id: string
) => Promise<boolean>;

export class BindingsManager {
  private static readonly PROVIDER_NAME = 'Internxt';
  private progressBuffer = 0;
  private controllers: IControllers;

  constructor(
    private readonly container: DependencyContainer,
    private readonly paths: {
      root: string;
      icon: string;
    }
  ) {
    this.controllers = buildControllers(this.container);
  }

  async load(): Promise<void> {
    this.container.existingItemsTreeBuilder.setFilterStatusesToFilter([
      ServerFileStatus.EXISTS,
      ServerFileStatus.TRASHED,
      ServerFileStatus.DELETED,
    ]);

    this.container.existingItemsTreeBuilder.setFolderStatusesToFilter([
      ServerFolderStatus.EXISTS,
      ServerFolderStatus.TRASHED,
      ServerFolderStatus.DELETED,
    ]);

    const tree = await this.container.existingItemsTreeBuilder.run();
    await Promise.all([
      this.container.folderRepositoryInitiator.run(tree.folders),
      this.container.foldersPlaceholderCreator.run(tree.folders),
      this.container.repositoryPopulator.run(tree.files),
      this.container.filesPlaceholderCreator.run(tree.files),
      this.container?.filesPlaceholderDeleter?.run(tree.trashedFilesList),
      this.container?.folderPlaceholderDeleter?.run(tree.trashedFoldersList),
    ]);
  }

  async start(version: string, providerId: string) {
    ipcRendererSyncEngine.send('SYNCING');
    await this.stop();
    await this.pollingStart();

    const callbacks = {
      notifyDeleteCallback: (
        contentsId: string,
        callback: (response: boolean) => void
      ) => {
        this.controllers.delete
          .execute(contentsId)
          .then(() => {
            callback(true);
          })
          .catch((error: Error) => {
            Logger.error(error);
            // Sentry.captureException(error);
            callback(false);
          });
        ipcRenderer.send('CHECK_SYNC');
      },
      notifyDeleteCompletionCallback: () => {
        Logger.info('Deletion completed');
      },
      notifyRenameCallback: (
        absolutePath: string,
        contentsId: string,
        callback: (response: boolean) => void
      ) => {
        try {
          Logger.debug('Path received from rename callback', absolutePath);

          const fn = executeControllerWithFallback({
            handler: this.controllers.renameOrMove.execute.bind(
              this.controllers.renameOrMove
            ),
            fallback: this.controllers.offline.renameOrMove.execute.bind(
              this.controllers.offline.renameOrMove
            ),
          });
          fn(absolutePath, contentsId, callback);
          const isFolder = fs.lstatSync(absolutePath).isDirectory();

          this.container.virtualDrive.updateSyncStatus(
            absolutePath,
            isFolder,
            true
          );
        } catch (error) {
          Logger.error('Error during rename or move operation', error);
        }
        ipcRendererSyncEngine.send('SYNCED');
        ipcRenderer.send('CHECK_SYNC');
      },
      notifyFileAddedCallback: async (
        absolutePath: string,
        callback: FileAddedCallback
      ) => {
        Logger.debug('Path received from callback', absolutePath);
        await this.controllers.addFile.execute(absolutePath);
        ipcRenderer.send('CHECK_SYNC');
      },
      fetchDataCallback: async (
        contentsId: FilePlaceholderId,
        callback: CallbackDownload
      ) => {
        try {
          Logger.debug('[Fetch Data Callback] Donwloading begins');
          const path = await this.controllers.downloadFile.execute(
            contentsId,
            callback
          );
          const file = this.controllers.downloadFile.fileFinderByContentsId(
            contentsId
              .replace(
                // eslint-disable-next-line no-control-regex
                /[\x00-\x1F\x7F-\x9F]/g,
                ''
              )
              .split(':')[1]
          );
          Logger.debug('[Fetch Data Callback] Preparing begins', path);
          let finished = false;
          try {
            while (!finished) {
              const result = await callback(true, path);
              finished = result.finished;
              Logger.debug('callback result', result);

              if (result.progress > 1 || result.progress < 0) {
                throw new Error('Result progress is not between 0 and 1');
              }

              if (finished && result.progress === 0) {
                throw new Error('Result progress is 0');
              } else if (this.progressBuffer == result.progress) {
                break;
              } else {
                this.progressBuffer = result.progress;
              }
              Logger.debug('condition', finished);
              ipcRendererSyncEngine.send('FILE_PREPARING', {
                name: file.name,
                extension: file.type,
                nameWithExtension: file.nameWithExtension,
                size: file.size,
                processInfo: {
                  elapsedTime: 0,
                  progress: result.progress,
                },
              });
            }
            this.progressBuffer = 0;
            await this.controllers.notifyPlaceholderHydrationFinished.execute(
              contentsId
            );
          } catch (error) {
            Logger.error('notify: ', error);
            // Sentry.captureException(error);
            // await callback(false, '');
            fs.unlinkSync(path);

            Logger.debug('[Fetch Data Callback] Finish...', path);
            return;
          }

          fs.unlinkSync(path);
          Logger.debug('[Fetch Data Callback] Finish...', path);
        } catch (error) {
          Logger.error(error);
          // Sentry.captureException(error);
          await callback(false, '');
          await this.container.virtualDrive.closeDownloadMutex();
        }
      },
      notifyMessageCallback: (
        message: string,
        action: ProcessIssue['action'],
        errorName: ProcessIssue['errorName'],
        callback: (response: boolean) => void
      ) => {
        try {
          callback(true);
          ipcRendererSyncEngine.send('SYNC_INFO_UPDATE', {
            name: message,
            action: action,
            errorName,
            process: 'SYNC',
            kind: 'LOCAL',
          });
          ipcRenderer.send('CHECK_SYNC');
        } catch (error) {
          Logger.error(error);
          // Sentry.captureException(error);
          callback(false);
        }
      },
      validateDataCallback: () => {
        Logger.debug('validateDataCallback');
      },
      cancelFetchDataCallback: async () => {
        await this.controllers.downloadFile.cancel();
        Logger.debug('cancelFetchDataCallback');
      },
      fetchPlaceholdersCallback: () => {
        Logger.debug('fetchPlaceholdersCallback');
      },
      cancelFetchPlaceholdersCallback: () => {
        Logger.debug('cancelFetchPlaceholdersCallback');
      },
      notifyFileOpenCompletionCallback: () => {
        Logger.debug('notifyFileOpenCompletionCallback');
      },
      notifyFileCloseCompletionCallback: () => {
        Logger.debug('notifyFileCloseCompletionCallback');
      },
      notifyDehydrateCallback: () => {
        Logger.debug('notifyDehydrateCallback');
      },
      notifyDehydrateCompletionCallback: () => {
        Logger.debug('notifyDehydrateCompletionCallback');
      },
      notifyRenameCompletionCallback: () => {
        Logger.debug('notifyRenameCompletionCallback');
      },
      noneCallback: () => {
        Logger.debug('noneCallback');
      },
    };

    await this.container.virtualDrive.registerSyncRoot(
      BindingsManager.PROVIDER_NAME,
      version,
      providerId,
      callbacks,
      this.paths.icon
    );

    await this.container.virtualDrive.connectSyncRoot();

    await runner([this.load.bind(this), this.polling.bind(this)]);
    ipcRendererSyncEngine.send('SYNCED');
  }

  async watch() {
    const queueManager = new QueueManager({
      handleAdd: async (task: QueueItem) => {
        try {
          Logger.debug('Path received from callback', task.path);
          const itemId = await this.controllers.addFile.execute(task.path);
          if (!itemId) {
            Logger.error('Error adding file' + task.path);
            return;
          }
          await this.container.virtualDrive.convertToPlaceholder(
            task.path,
            itemId
          );
          await this.container.virtualDrive.updateSyncStatus(
            task.path,
            task.isFolder,
            true
          );
          ipcRenderer.send('CHECK_SYNC');
        } catch (error) {
          Logger.error(`error adding file ${task.path}`);
          Logger.error(error);
          // Sentry.captureException(error);
        }
      },
      handleHydrate: async (task: QueueItem) => {
        try {
          Logger.debug('[Handle Hydrate Callback] Preparing begins', task.path);

          const atributtes =
            await this.container.virtualDrive.getPlaceholderAttribute(
              task.path
            );
          Logger.debug('atributtes', atributtes);

          const status = await this.container.virtualDrive.getPlaceholderState(
            task.path
          );

          Logger.debug('status', status);

          await this.container.virtualDrive.hydrateFile(task.path);
          ipcRenderer.send('CHECK_SYNC');

          Logger.debug('[Handle Hydrate Callback] Finish begins', task.path);
        } catch (error) {
          Logger.error(`error hydrating file ${task.path}`);
          Logger.error(error);
          // Sentry.captureException(error);
        }
      },
      handleDehydrate: async (task: QueueItem) => {
        try {
          Logger.debug('Dehydrate', task);
          await this.container.virtualDrive.dehydrateFile(task.path);
        } catch (error) {
          Logger.error(`error dehydrating file ${task.path}`);
          Logger.error(error);
          // Sentry.captureException(error);
        }
      },
      handleChangeSize: async (task: QueueItem) => {
        try {
          Logger.debug('Change size', task);
          await this.container.fileSyncOrchestrator.run([task.path]);
        } catch (error) {
          Logger.error(`error changing size ${task.path}`);
          Logger.error(error);
          // Sentry.captureException(error);
        }
      },
    });
    const logWatcherPath = DependencyInjectionLogWatcherPath.get();
    this.container.virtualDrive.watchAndWait(
      this.paths.root,
      queueManager,
      logWatcherPath
    );
    await queueManager.processAll();
  }

  async stop() {
    await this.container.virtualDrive.disconnectSyncRoot();
    this.container.pollingMonitorStop.run();
  }

  async cleanUp() {
    await VirtualDrive.unregisterSyncRoot(this.paths.root);

    const files = await this.container.retrieveAllFiles.run();
    const folders = await this.container.retrieveAllFolders.run();

    const items = [...files, ...folders];

    const win32AbsolutePaths = items.map((item) => {
      const posixRelativePath = item.path;
      // este path es relativo al root y en formato posix

      const win32RelativePaths =
        PlatformPathConverter.posixToWin(posixRelativePath);

      return this.container.relativePathToAbsoluteConverter.run(
        win32RelativePaths
      );
    });

    Logger.debug('win32AbsolutePaths', win32AbsolutePaths);

    // find all common string in remainingItems and win32AbsolutePaths
    // and delete them
    // const commonItems = remainingItems.filter((item) =>
    //   win32AbsolutePaths.includes(item)
    // );
    // const toDeleteFolder: string[] = [];
    // commonItems.forEach((item) => {
    //   try {
    //     const stat = fs.statSync(item);
    //     if (stat.isDirectory()) {
    //       toDeleteFolder.push(item);
    //     } else if (stat.isFile()) {
    //       fs.unlinkSync(item);
    //     }
    //   } catch (error) {
    //     Logger.error(error);
    //   }
    // });
  }

  async update() {
    Logger.info('[SYNC ENGINE]: Updating placeholders');
    ipcRendererSyncEngine.send('SYNCING');

    try {
      const tree = await this.container.existingItemsTreeBuilder.run();

      // Delete all the placeholders that are not in the tree
      await this.container?.filesPlaceholderDeleter?.run(tree.trashedFilesList);
      await this.container?.folderPlaceholderDeleter?.run(
        tree.trashedFoldersList
      );

      // Create all the placeholders that are in the tree
      await this.container.folderPlaceholderUpdater.run(tree.folders);
      await this.container.filesPlaceholderUpdater.run(tree.files);
      ipcRendererSyncEngine.send('SYNCED');
      ipcRenderer.send('CHECK_SYNC');
    } catch (error) {
      Logger.error('[SYNC ENGINE] ', error);
      // Sentry.captureException(error);
    }
  }

  private async pollingStart() {
    Logger.debug('[SYNC ENGINE] Starting polling');
    return this.container.pollingMonitorStart.run(this.polling.bind(this));
  }

  async polling(): Promise<void> {
    try {
      Logger.info('[SYNC ENGINE] Monitoring polling...');
      ipcRendererSyncEngine.send('SYNCING');
      const fileInPendingPaths =
        (await this.container.virtualDrive.getPlaceholderWithStatePending()) as Array<string>;
      Logger.info('[SYNC ENGINE] fileInPendingPaths', fileInPendingPaths);

      await this.container.fileSyncOrchestrator.run(fileInPendingPaths);
      ipcRendererSyncEngine.send('SYNCED');
      ipcRenderer.send('CHECK_SYNC');
    } catch (error) {
      Logger.error('[SYNC ENGINE] Polling', error);
      // Sentry.captureException(error);
    }
  }
  async getFileInSyncPending(): Promise<string[]> {
    try {
      Logger.info('[SYNC ENGINE] Updating unsync files...');

      const fileInPendingPaths =
        (await this.container.virtualDrive.getPlaceholderWithStatePending()) as Array<string>;
      Logger.info('[SYNC ENGINE] fileInPendingPaths', fileInPendingPaths);

      return fileInPendingPaths;
    } catch (error) {
      Logger.error('[SYNC ENGINE]  Updating unsync files error: ', error);
      // Sentry.captureException(error);
      return [];
    }
  }
}
