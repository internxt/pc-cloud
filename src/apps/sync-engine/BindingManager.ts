import Logger from 'electron-log';
import * as fs from 'fs';
// @ts-ignore
import { VirtualDrive } from 'virtual-drive/dist';
import { FilePlaceholderId } from '../../context/virtual-drive/files/domain/PlaceholderId';
import { PlatformPathConverter } from '../../context/virtual-drive/shared/application/PlatformPathConverter';
import { buildControllers } from './callbacks-controllers/buildControllers';
import { executeControllerWithFallback } from './callbacks-controllers/middlewares/executeControllerWithFallback';
import { SyncEngineDependencyContainer } from './dependency-injection/SyncEngineDependencyContainer';
import { SyncEngineIPC } from './SyncEngineIpc';
import { VirtualDriveIssue } from '../../shared/issues/VirtualDriveIssue';
import { ItemsSearcher } from '../../context/virtual-drive/tree/application/ItemsSearcher';

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
  constructor(
    private readonly container: SyncEngineDependencyContainer,
    private readonly paths: {
      root: string;
      icon: string;
    }
  ) {}

  async load(): Promise<void> {
    const tree = await this.container.existingItemsTreeBuilder.run();

    await this.container.repositoryPopulator.run(tree.files);
    await this.container.filesPlaceholderCreator.run(tree.files);

    await this.container.folderRepositoryInitiator.run(tree.folders);
    await this.container.foldersPlaceholderCreator.run(tree.folders);
  }

  async start(version: string, providerId: string) {
    await this.stop();
    await this.pollingStart();

    const controllers = buildControllers(this.container);

    const callbacks = {
      notifyDeleteCallback: (
        contentsId: string,
        callback: (response: boolean) => void
      ) => {
        controllers.delete
          .execute(contentsId)
          .then(() => {
            callback(true);
          })
          .catch((error: Error) => {
            Logger.error(error);
            callback(false);
          });
        SyncEngineIPC.send('CHECK_SYNC');
      },
      notifyDeleteCompletionCallback: () => {
        Logger.info('Deletion completed');
      },
      notifyRenameCallback: (
        absolutePath: string,
        contentsId: string,
        callback: (response: boolean) => void
      ) => {
        const fn = executeControllerWithFallback({
          handler: controllers.renameOrMove.execute.bind(
            controllers.renameOrMove
          ),
          fallback: controllers.offline.renameOrMove.execute.bind(
            controllers.offline.renameOrMove
          ),
        });
        fn(absolutePath, contentsId, callback);
        SyncEngineIPC.send('CHECK_SYNC');
      },
      notifyFileAddedCallback: (
        absolutePath: string,
        callback: FileAddedCallback
      ) => {
        Logger.debug('Path received from callback', absolutePath);
        controllers.addFile.execute(absolutePath, callback);
        SyncEngineIPC.send('CHECK_SYNC');
      },
      fetchDataCallback: async (
        contentsId: FilePlaceholderId,
        callback: CallbackDownload
      ) => {
        try {
          Logger.debug('[Fetch Data Callback] Downloading begins');
          const path = await controllers.downloadFile.execute(contentsId);
          const file = await controllers.downloadFile.fileFinderByContentsId(
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

              if (finished && result.progress === 0) {
                throw new Error('Result progress is 0');
              } else if (this.progressBuffer == result.progress) {
                break;
              } else {
                this.progressBuffer = result.progress;
              }
              Logger.debug('condition', finished);
              SyncEngineIPC.send('FILE_PREPARING', {
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

            await controllers.notifyPlaceholderHydrationFinished.execute(
              contentsId
            );

            await this.container.virtualDrive.closeDownloadMutex();
          } catch (error) {
            Logger.error('notify: ', error);
            await this.container.virtualDrive.closeDownloadMutex();
          }

          // Esperar hasta que la ejecución de fetchDataCallback esté completa antes de continuar
          await new Promise((resolve) => {
            setTimeout(() => {
              Logger.debug('timeout');
              resolve(true);
            }, 500);
          });

          fs.unlinkSync(path);
          SyncEngineIPC.send('CHECK_SYNC');
        } catch (error) {
          Logger.error(error);
          callback(false, '');
        }
      },
      notifyMessageCallback: (
        message: string,
        _error: VirtualDriveIssue['error'],
        cause: VirtualDriveIssue['cause'],
        callback: (response: boolean) => void
      ) => {
        try {
          callback(true);
          SyncEngineIPC.send('FILE_UPLOAD_ERROR', {
            name: message,
            cause,
            extension: '',
            nameWithExtension: '',
          });
          SyncEngineIPC.send('CHECK_SYNC');
        } catch (error) {
          Logger.error(error);
          callback(false);
        }
      },
      validateDataCallback: () => {
        Logger.debug('validateDataCallback');
      },
      cancelFetchDataCallback: () => {
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

    await this.load();
  }

  watch() {
    this.container.virtualDrive.watchAndWait(this.paths.root);
  }

  async stop() {
    await this.container.virtualDrive.disconnectSyncRoot();
    this.container.pollingMonitorStop.run();
  }

  async cleanUp() {
    await VirtualDrive.unregisterSyncRoot(this.paths.root);

    const itemsSearcher = new ItemsSearcher();
    const remainingItems = itemsSearcher.listFilesAndFolders(this.paths.root);

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

    Logger.debug('remainingItems', remainingItems);
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

    try {
      const tree = await this.container.existingItemsTreeBuilder.run();

      await this.container.filesPlaceholderUpdater.run(tree.files);
      await this.container.folderPlaceholderUpdater.run(tree.folders);
    } catch (error) {
      Logger.error('[SYNC ENGINE] ', error);
    }
  }

  private async pollingStart() {
    return this.container.pollingMonitorStart.run(this.polling.bind(this));
  }

  private async polling(): Promise<void> {
    try {
      Logger.info('[SYNC ENGINE] Monitoring polling...');

      const fileInPendingPaths =
        (await this.container.virtualDrive.getPlaceholderWithStatePending()) as Array<string>;
      Logger.info('[SYNC ENGINE] fileInPendingPaths', fileInPendingPaths);
      await this.container.fileSyncOrchestrator.run(fileInPendingPaths);
      SyncEngineIPC.send('CHECK_SYNC');
    } catch (error) {
      Logger.error('[SYNC ENGINE] Polling', error);
    }
  }
}
