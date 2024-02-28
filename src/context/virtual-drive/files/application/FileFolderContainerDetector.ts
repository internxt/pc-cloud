import { FolderFinder } from '../../folders/application/FolderFinder';
import { File } from '../../files/domain/File';
import { Folder } from '../../folders/domain/Folder';
import { FileNotFoundError } from '../domain/errors/FileNotFoundError';
import { SingleFileMatchingFinder } from './SingleFileMatchingFinder';

export class FileFolderContainerDetector {
  constructor(
    private readonly singleFileMatchingFinder: SingleFileMatchingFinder,
    private readonly folderFinder: FolderFinder
  ) {}

  async run(
    contentId: File['contentsId'],
    folderContentId: Folder['uuid']
  ): Promise<boolean> {
    const file = await this.singleFileMatchingFinder.run({
      contentsId: contentId,
    });
    if (!file) {
      throw new FileNotFoundError(contentId);
    }
    const folder = this.folderFinder.findFromId(file.folderId);
    return folder.uuid === folderContentId;
  }
}
