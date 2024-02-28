import { AllParentFoldersStatusIsExists } from '../../../../context/virtual-drive/folders/application/AllParentFoldersStatusIsExists';
import { FolderCreatorFromOfflineFolder } from '../../../../context/virtual-drive/folders/application/FolderCreatorFromOfflineFolder';
import { ParentFolderFinder } from '../../../../context/virtual-drive/folders/application/ParentFolderFinder';
import { FolderPathUpdater } from '../../../../context/virtual-drive/folders/application/FolderPathUpdater';
import { FolderRepositoryInitializer } from '../../../../context/virtual-drive/folders/application/FolderRepositoryInitializer';
import { FoldersPlaceholderCreator } from '../../../../context/virtual-drive/folders/application/FoldersPlaceholderCreator';
import { OfflineFolderCreator } from '../../../../context/virtual-drive/folders/application/Offline/OfflineFolderCreator';
import { OfflineFolderPathUpdater } from '../../../../context/virtual-drive/folders/application/Offline/OfflineFolderPathUpdater';
import { RetrieveAllFolders } from '../../../../context/virtual-drive/folders/application/RetrieveAllFolders';
import { RetryFolderDeleter } from '../../../../context/virtual-drive/folders/application/RetryFolderDeleter';
import { SynchronizeOfflineModifications } from '../../../../context/virtual-drive/folders/application/SynchronizeOfflineModifications';
import { SynchronizeOfflineModificationsOnFolderCreated } from '../../../../context/virtual-drive/folders/application/SynchronizeOfflineModificationsOnFolderCreated';
import { FolderPlaceholderUpdater } from '../../../../context/virtual-drive/folders/application/UpdatePlaceholderFolder';
import { FolderPlaceholderConverter } from '../../../../context/virtual-drive/folders/application/FolderPlaceholderConverter';
import { FolderSyncStatusUpdater } from '../../../../context/virtual-drive/folders/application/FolderSyncStatusUpdater';
import { FoldersFatherSyncStatusUpdater } from '../../../../context/virtual-drive/folders/application/FoldersFatherSyncStatusUpdater';
import { FolderFinder } from '../../../../context/virtual-drive/folders/application/FolderFinder';

export interface FoldersContainer {
  folderCreator: FolderCreatorFromOfflineFolder;
  parentFolderFinder: ParentFolderFinder;
  retryFolderDeleter: RetryFolderDeleter;
  allParentFoldersStatusIsExists: AllParentFoldersStatusIsExists;
  folderPathUpdater: FolderPathUpdater;
  synchronizeOfflineModificationsOnFolderCreated: SynchronizeOfflineModificationsOnFolderCreated;
  offline: {
    folderCreator: OfflineFolderCreator;
    folderPathUpdater: OfflineFolderPathUpdater;
    synchronizeOfflineModifications: SynchronizeOfflineModifications;
  };
  retrieveAllFolders: RetrieveAllFolders;
  folderRepositoryInitiator: FolderRepositoryInitializer;
  folderPlaceholderUpdater: FolderPlaceholderUpdater;
  foldersPlaceholderCreator: FoldersPlaceholderCreator;
  folderPlaceholderConverter: FolderPlaceholderConverter;
  folderSyncStatusUpdater: FolderSyncStatusUpdater;
  foldersFatherSyncStatusUpdater: FoldersFatherSyncStatusUpdater;
  folderFinder: FolderFinder;
}
