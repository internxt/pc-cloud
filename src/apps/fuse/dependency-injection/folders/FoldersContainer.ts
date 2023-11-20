import { FolderFinder } from '../../../../context/virtual-drive/folders/application/FolderFinder';
import { FolderSearcher } from '../../../../context/virtual-drive/folders/application/FolderSearcher';
import { FoldersByParentPathSearcher } from '../../../../context/virtual-drive/folders/application/FoldersByParentPathNameLister';

export interface FoldersContainer {
  folderFinder: FolderFinder;
  folderSearcher: FolderSearcher;
  foldersByParentPathSearcher: FoldersByParentPathSearcher;
}
