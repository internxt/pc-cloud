import { Either } from '../../../../shared/domain/Either';
import { Folder, FolderAttributes } from '../Folder';
import { FolderId } from '../FolderId';
import { FolderPath } from '../FolderPath';
import { FolderUuid } from '../FolderUuid';
import { OfflineFolder } from '../OfflineFolder';

export type FolderPersistedDto = {
  id: number;
  uuid: string;
  parentId: number;
  updatedAt: string;
  createdAt: string;
};

export type RemoteFileSystemErrors =
  | 'ALREADY_EXISTS'
  | 'WRONG_DATA'
  | 'UNHANDLED';

export abstract class RemoteFileSystem {
  abstract persistv2(
    path: FolderPath,
    parentId: FolderId,
    uuid?: FolderUuid
  ): Promise<Either<RemoteFileSystemErrors, FolderPersistedDto>>;

  abstract persist(offline: OfflineFolder): Promise<FolderAttributes>;

  abstract trash(id: Folder['id']): Promise<void>;

  abstract move(folder: Folder): Promise<void>;

  abstract rename(folder: Folder): Promise<void>;

  abstract searchWith(
    parentId: FolderId,
    folderPath: FolderPath
  ): Promise<Folder | undefined>;
}

// import { Folder, FolderAttributes } from '../Folder';
// import { FolderStatuses } from '../FolderStatus';
// import { OfflineFolder } from '../OfflineFolder';

// export interface RemoteFileSystem {
//   persist(offline: OfflineFolder): Promise<FolderAttributes>;

//   trash(id: Folder['id']): Promise<void>;

//   move(folder: Folder): Promise<void>;

//   rename(folder: Folder): Promise<void>;

//   checkStatusFolder(uuid: Folder['uuid']): Promise<FolderStatuses>;
// }
