import { Folder } from '../domain/Folder';
import { FolderRepository } from '../domain/FolderRepository';

export class FolderContainerDetector {
  constructor(private readonly repository: FolderRepository) {}

  async run(
    folderContentId: Folder['uuid'],
    parentFolderContentId: Folder['uuid']
  ): Promise<boolean> {
    const folder = await this.repository.searchByUuid(folderContentId);

    if (!folder) {
      throw new Error('Folder not found');
    }

    const parent = await this.repository.searchById(folder.parentId as number);

    if (!parent) {
      throw new Error('Parent folder not found');
    }

    return parent.uuid === parentFolderContentId;
  }
}
