import { CreateFilePlaceholderOnDeletionFailed } from '../../../../context/virtual-drive/files/application/CreateFilePlaceholderOnDeletionFailed';
import { FileCheckerStatusInRoot } from '../../../../context/virtual-drive/files/application/FileCheckerStatusInRoot';
import { FileCreator } from '../../../../context/virtual-drive/files/application/FileCreator';
import { FileDeleter } from '../../../../context/virtual-drive/files/application/FileDeleter';
import { FileFolderContainerDetector } from '../../../../context/virtual-drive/files/application/FileFolderContainerDetector';
import { FilePathUpdater } from '../../../../context/virtual-drive/files/application/FilePathUpdater';
import { FilePlaceholderCreatorFromContentsId } from '../../../../context/virtual-drive/files/application/FilePlaceholderCreatorFromContentsId';
import { FileRepositoryInitializer } from '../../../../context/virtual-drive/files/application/FileRepositoryInitializer';
import { FileSynchronizer } from '../../../../context/virtual-drive/files/application/FileSyncronizer';
import { FilesPlaceholderUpdater } from '../../../../context/virtual-drive/files/application/FilesPlaceholderUpdater';
import { FilesPlaceholderCreator } from '../../../../context/virtual-drive/files/application/FilesPlaceholdersCreator';
import { RetrieveAllFiles } from '../../../../context/virtual-drive/files/application/RetrieveAllFiles';
import { SameFileWasMoved } from '../../../../context/virtual-drive/files/application/SameFileWasMoved';
import { SingleFileMatchingFinder } from '../../../../context/virtual-drive/files/application/SingleFileMatchingFinder';

export interface FilesContainer {
  fileDeleter: FileDeleter;
  fileFolderContainerDetector: FileFolderContainerDetector;
  filePathUpdater: FilePathUpdater;
  fileCreator: FileCreator;
  fileSyncronizer: FileSynchronizer;
  filePlaceholderCreatorFromContentsId: FilePlaceholderCreatorFromContentsId;
  createFilePlaceholderOnDeletionFailed: CreateFilePlaceholderOnDeletionFailed;
  sameFileWasMoved: SameFileWasMoved;
  retrieveAllFiles: RetrieveAllFiles;
  repositoryPopulator: FileRepositoryInitializer;
  filesPlaceholderCreator: FilesPlaceholderCreator;
  filesPlaceholderUpdater: FilesPlaceholderUpdater;
  singleFileMatchingFinder: SingleFileMatchingFinder;
  filesCheckerStatusInRoot: FileCheckerStatusInRoot;
}
