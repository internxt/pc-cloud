import { RelativePathToAbsoluteConverter } from '../../shared/application/RelativePathToAbsoluteConverter';
import { Folder } from '../domain/Folder';
import { FolderStatuses } from '../domain/FolderStatus';
import { RemoteFolderSystem } from '../domain/file-systems/RemoteFolderSystem';
import { LocalFolderSystem } from '../domain/file-systems/LocalFolderSystem';
import Logger from 'electron-log';
import { sleep } from '../../../../apps/main/util';

export class FolderPlaceholderDeleter {
  constructor(
    private readonly relativePathToAbsoluteConverter: RelativePathToAbsoluteConverter,
    private readonly remoteFileSystem: RemoteFolderSystem,
    private readonly local: LocalFolderSystem
  ) {}

  private async hasToBeDeleted(remote: Folder): Promise<boolean> {
    if (!remote.path) {
      return false;
    }
    const localUUID = await this.local.getFileIdentity(remote.path);
    Logger.info(`Local UUID: ${localUUID}, remote path: ${remote.path}`);

    if (!localUUID) {
      Logger.info(`Local UUID not found for ${remote.path}, skipping deletion`);
      return false;
    }

    sleep(500);
    const folderStatus = await this.remoteFileSystem.checkStatusFolder(
      remote.uuid
    );

    // temporal condition to avoid deleting folders that are not in the trash
    // https://github.com/internxt/drive-desktop/blob/60f2ee9a28eab37438b3e8365f4bd519e748a047/src/context/virtual-drive/folders/infrastructure/HttpRemoteFileSystem.ts#L70
    if (
      folderStatus === FolderStatuses.DELETED &&
      !(remote.status === FolderStatuses.DELETED) &&
      !(remote.status === FolderStatuses.TRASHED)
    ) {
      Logger.info(
        `Folder ${remote.path} with undefined status, skipping deletion`
      );
      return false;
    }

    Logger.info(
      `
      Localdb path: ${remote.path}\n
      ___________\n
      Condition Status: ${
        folderStatus === FolderStatuses.TRASHED ||
        folderStatus === FolderStatuses.DELETED
      }\n
      Condition ID: ${localUUID.split(':')[1] === remote['uuid']}\n`
    );

    return (
      (folderStatus === FolderStatuses.TRASHED ||
        folderStatus === FolderStatuses.DELETED) &&
      localUUID.split(':')[1]?.trim() === remote['uuid']?.trim()
    );
  }

  private async delete(remote: Folder): Promise<void> {
    const hasToBeDeleted = await this.hasToBeDeleted(remote);

    if (hasToBeDeleted) {
      await this.local.deleteFileSyncRoot(remote.path);
    }
  }

  async run(remotes: Folder[]): Promise<void> {
    await Promise.all(
      remotes.map(async (remote) => {
        await this.delete(remote);
      })
    );
  }
}
