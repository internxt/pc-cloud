import { File } from '../domain/File';
import { LocalFileSystem } from '../domain/file-systems/LocalFileSystem';

export class FilePlaceholderConverter {
  constructor(private readonly localFileSystem: LocalFileSystem) {}

  async run(file: File) {
    await this.localFileSystem.convertToPlaceholder(file);
  }
}
