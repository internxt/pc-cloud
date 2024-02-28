import { Folder } from '../domain/Folder';
import { LocalFileSystem } from '../domain/file-systems/LocalFileSystem';

export class FuseLocalFileSystem implements LocalFileSystem {
  async updateSyncStatus(_folder: Folder): Promise<void> {
    //no-op
  }
  async convertToPlaceholder(_folder: Folder): Promise<void> {
    //no-op
  }
  async getPlaceholderState(_folder: Folder): Promise<void> {
    //no-op
  }
  async createPlaceHolder(_folder: Folder): Promise<void> {
    //no-op
  }
}
