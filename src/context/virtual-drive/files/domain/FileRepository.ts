import { File, FileAttributes } from './File';

export interface FileRepository {
  all(): Promise<Array<File>>;

  matchingPartial(partial: Partial<FileAttributes>): Array<File>;

  searchById(id: File['id']): Promise<File | undefined>;

  searchByContentsId(id: File['contentsId']): Promise<File | undefined>;

  allSearchByPartial(partial: Partial<FileAttributes>): Promise<Array<File>>;

  delete(id: File['contentsId']): Promise<void>;

  add(file: File): Promise<void>;

  update(file: File): Promise<void>;

  updateContentsAndSize(
    file: File,
    newContentsId: File['contentsId'],
    newSize: File['size']
  ): Promise<File>;
}
