import {
  PinState,
  SyncState,
} from '../../../../apps/shared/types/PlaceholderStates';
import { RelativePathToAbsoluteConverter } from '../../shared/application/RelativePathToAbsoluteConverter';
import { File } from '../domain/File';
import { PlaceholderState } from '../domain/PlaceholderState';
import { LocalFileSystem } from '../domain/file-systems/LocalFileSystem';
import fs from 'fs/promises';

export class FuseLocalFileSystem implements LocalFileSystem {
  constructor(
    private readonly relativePathToAbsoluteConverter: RelativePathToAbsoluteConverter
  ) {}

  async updateSyncStatus(_file: File): Promise<void> {
    // no-op
  }

  async convertToPlaceholder(_file: File): Promise<void> {
    // no-op
  }

  async getPlaceholderState(_file: File): Promise<void> {
    // no-op
  }

  async getPlaceholderStateByRelativePath(
    _relativePath: string
  ): Promise<PlaceholderState> {
    return {
      pinState: PinState.Inherited,
      syncState: SyncState.InSync,
    };
  }

  async createPlaceHolder(_file: File): Promise<void> {
    // no-op
  }

  async getLocalFileId(file: File): Promise<`${string}-${string}`> {
    const win32AbsolutePath = this.relativePathToAbsoluteConverter.run(
      file.path
    );

    const { ino, dev } = await fs.stat(win32AbsolutePath);

    return `${dev}-${ino}`;
  }
}
