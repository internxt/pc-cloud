import Logger from 'electron-log';
import { VirtualDrive, QueueItem, QueueManager } from 'virtual-drive/dist';
import { FilePlaceholderId } from '../../context/virtual-drive/files/domain/PlaceholderId';
import { IControllers, buildControllers } from './callbacks-controllers/buildControllers';
import { executeControllerWithFallback } from './callbacks-controllers/middlewares/executeControllerWithFallback';
import { DependencyContainer } from './dependency-injection/DependencyContainer';
import { ipcRendererSyncEngine } from './ipcRendererSyncEngine';
import { ProcessIssue } from '../shared/types';
import { ipcRenderer } from 'electron';
import { ServerFileStatus } from '../../context/shared/domain/ServerFile';
import { ServerFolderStatus } from '../../context/shared/domain/ServerFolder';

export type CallbackDownload = (success: boolean, filePath: string) => Promise<{ finished: boolean; progress: number }>;

export type FileAddedCallback = (acknowledge: boolean, id: string) => Promise<boolean>;

export class BindingsManager {
  private static readonly PROVIDER_NAME = 'Internxt';
  private progressBuffer = 0;
  constructor(
    public readonly container: DependencyContainer,
    private readonly paths: {
      root: string;
      icon: string;
    },
    private readonly fetchData = new FetchDataService(),
    private readonly handleHydrate = new HandleHydrate()
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
      notifyDeleteCallback: (contentsId: string, callback: (response: boolean) => void) => {
        Logger.debug('Path received from delete callback', contentsId);
        this.controllers.delete
          .execute(contentsId)
          .then(() => {
            callback(true);
            ipcRenderer.invoke('DELETE_ITEM_DRIVE', contentsId);
          })
          .catch((error: Error) => {
            Logger.error(error);
            Sentry.captureException(error);
            callback(false);
          });
        ipcRenderer.send('SYNCED');
      },
      notifyDeleteCompletionCallback: () => {
        Logger.info('Deletion completed');
      },
      notifyRenameCallback: async (absolutePath: string, contentsId: string, callback: (response: boolean) => void) => {
        try {
          Logger.debug('Path received from rename callback', absolutePath);

          if (this.lastMoved === absolutePath) {
            Logger.debug('Same file moved');
            this.lastMoved = '';
            callback(true);
            return;
          }

          const isTempFile = await isTemporaryFile(absolutePath);

          Logger.debug('[isTemporaryFile]', isTempFile);

          if (isTempFile && !contentsId.startsWith('FOLDER')) {
            Logger.debug('File is temporary, skipping');
            callback(true);
            return;
          }

          const fn = executeControllerWithFallback({
            handler: this.controllers.renameOrMove.execute.bind(this.controllers.renameOrMove),
            fallback: this.controllers.offline.renameOrMove.execute.bind(this.controllers.offline.renameOrMove),
          });
          fn(absolutePath, contentsId, callback);
          Logger.debug('Finish Rename', absolutePath);
          this.lastMoved = absolutePath;
        } catch (error) {
          Logger.error('Error during rename or move operation', error);
        }
        ipcRendererSyncEngine.send('SYNCED');
        ipcRenderer.send('CHECK_SYNC');
      },
      notifyFileAddedCallback: async (absolutePath: string, callback: FileAddedCallback) => {
        Logger.debug('Path received from callback', absolutePath);
        await this.controllers.addFile.execute(absolutePath);
        ipcRenderer.send('CHECK_SYNC');
      },
      fetchDataCallback: (contentsId: FilePlaceholderId, callback: CallbackDownload) => {
        try {
          Logger.debug('[Fetch Data Callback] Donwloading begins');
          const path = await controllers.downloadFile.execute(contentsId);
          const file = controllers.downloadFile.fileFinderByContentsId(
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

            await controllers.notifyPlaceholderHydrationFinished.execute(contentsId);

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
          ipcRenderer.send('CHECK_SYNC');
        } catch (error) {
          Logger.error(error);
          callback(false, '');
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
          Sentry.captureException(error);
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

    await this.container.virtualDrive.registerSyncRoot(BindingsManager.PROVIDER_NAME, version, providerId, callbacks, this.paths.icon);

    await this.container.virtualDrive.connectSyncRoot();

    await this.load();
  }

  async watch() {
    const callbacks = {
      handleAdd: async (task: QueueItem) => {
        try {
          Logger.debug('Path received from handle add', task.path);

          const tempFile = await isTemporaryFile(task.path);

          Logger.debug('[isTemporaryFile]', tempFile);

          if (tempFile && !task.isFolder) {
            Logger.debug('File is temporary, skipping');
            return;
          }

          const itemId = await this.controllers.addFile.execute(task.path);
          if (!itemId) {
            Logger.error('Error adding file' + task.path);
            return;
          }
          await this.container.virtualDrive.convertToPlaceholder(task.path, itemId);
          await this.container.virtualDrive.updateSyncStatus(task.path, task.isFolder, true);
        } catch (error) {
          Logger.error(`error adding file ${task.path}`);
          Logger.error(error);
          Sentry.captureException(error);
        }
      },
      handleHydrate: (task: QueueItem) => this.handleHydrate.run({ self: this, task }),
      handleDehydrate: async (task: QueueItem) => {
        try {
          Logger.debug('Dehydrate', task);
          await this.container.virtualDrive.dehydrateFile(task.path);
        } catch (error) {
          Logger.error(`error dehydrating file ${task.path}`);
          Logger.error(error);
          Sentry.captureException(error);
        }
      },
      handleChangeSize: async (task: QueueItem) => {
        try {
          Logger.debug('Change size', task);
          await this.container.fileSyncOrchestrator.run([task.path]);
        } catch (error) {
          Logger.error(`error changing size ${task.path}`);
          Logger.error(error);
          Sentry.captureException(error);
        }
      },
    };

    const notify = {
      onTaskSuccess: async () => ipcRendererSyncEngine.send('SYNCED'),
      onTaskProcessing: async () => ipcRendererSyncEngine.send('SYNCING'),
    };

    const persistQueueManager: string = configStore.get('persistQueueManagerPath');

    Logger.debug('persistQueueManager', persistQueueManager);

    const queueManager = new QueueManager(callbacks, notify, persistQueueManager);
    this.queueManager = queueManager;
    const logWatcherPath = DependencyInjectionLogWatcherPath.get();
    this.container.virtualDrive.watchAndWait(this.paths.root, queueManager, logWatcherPath);
    await queueManager.processAll();
  }

  async stop() {
    await this.container.virtualDrive.disconnectSyncRoot();
    this.container.pollingMonitorStop.run();
  }

  async cleanUp() {
    await VirtualDrive.unregisterSyncRoot(this.paths.root);
  }

  async cleanQueue() {
    if (this.queueManager) {
      this.queueManager.clearQueue();
    }
  }

  async update() {
    Logger.info('[SYNC ENGINE]: Updating placeholders');
    ipcRendererSyncEngine.send('SYNCING');

    try {
      const tree = await this.container.existingItemsTreeBuilder.run();

      await Promise.all([
        // Delete all the placeholders that are not in the tree
        this.container?.filesPlaceholderDeleter?.run(tree.trashedFilesList),
        this.container?.folderPlaceholderDeleter?.run(tree.trashedFoldersList),
        // Create all the placeholders that are in the tree
        this.container.folderPlaceholderUpdater.run(tree.folders),
        this.container.filesPlaceholderUpdater.run(tree.files),
      ]);
      ipcRendererSyncEngine.send('SYNCED');
    } catch (error) {
      Logger.error('[SYNC ENGINE] ', error);
      Sentry.captureException(error);
    }
  }

  private async pollingStart() {
    Logger.debug('[SYNC ENGINE] Starting polling');
    return this.container.pollingMonitorStart.run(this.polling.bind(this));
  }

  async polling(): Promise<void> {
    try {
      ipcRendererSyncEngine.send('SYNCING');
      Logger.info('[SYNC ENGINE] Monitoring polling...');
      const fileInPendingPaths = (await this.container.virtualDrive.getPlaceholderWithStatePending()) as Array<string>;
      Logger.info('[SYNC ENGINE] fileInPendingPaths', fileInPendingPaths);

      await this.container.fileSyncOrchestrator.run(fileInPendingPaths);
    } catch (error) {
      Logger.error('[SYNC ENGINE] Polling', error);
    }
  }
}
