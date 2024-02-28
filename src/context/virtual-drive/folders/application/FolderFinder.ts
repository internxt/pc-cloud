import { FilePath } from '../../files/domain/FilePath';
import { FolderNotFoundError } from '../domain/errors/FolderNotFoundError';
import { Folder } from '../domain/Folder';
import { FolderRepository } from '../domain/FolderRepository';

export class FolderFinder {
  constructor(private readonly repository: FolderRepository) {}

  run(path: string): Folder {
    const folder = this.repository.matchingPartial({ path })[0];

    if (!folder) {
      throw new FolderNotFoundError(path);
    }

    return folder;
  }

  findFromFilePath(path: FilePath): Folder {
    const folder = this.repository.matchingPartial({ path: path.dirname() })[0];

    if (!folder) {
      throw new FolderNotFoundError(path.dirname());
    }

    return folder;
  }

  findFromId(id: Folder['id']): Folder {
    const folder = this.repository.matchingPartial({ id })[0];
    if (!folder) {
      throw new Error('Folder not found');
    }
    return folder;
  }
}
