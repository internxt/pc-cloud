import { execSync } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 } from 'uuid';
import { beforeEach } from 'vitest';

import { sleep } from '@/apps/main/util';
import { TEST_FILES } from '../../../../tests/jest/setup.helper.test';
import { createVirtualDrive } from './create-virtual-drive.helper.test';
import { QueueManager } from 'virtual-drive/dist';

describe('Virtual Drive', () => {
  const { drive, syncRootPath, callback } = createVirtualDrive();
  const queueManager = new QueueManager();
  drive.watchAndWait(syncRootPath, {}, '')

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe('When add items', () => {
    it('When add an empty folder, then emit one addDir event', async () => {
      // Arrange
      const folder = join(syncRootPath, v4());

      // Act
      execSync(`mkdir ${folder}`);
      await sleep(50);

      // Assert
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('When add a file, then emit one add event', async () => {
      // Arrange
      const syncRootPath = join(TEST_FILES, v4());
      const file = join(syncRootPath, `${v4()}.txt`);
      await setupWatcher(syncRootPath);

      // Act
      execSync(`echo. 2>${file}`);
      await sleep(50);

      // Assert
      expect(getEvents()).toEqual(['addDir', 'add']);
      expect(onAdd.execute).toHaveBeenCalledWith(expect.objectContaining({ path: file }));
    });

    it('When add a folder and a file inside, then emit one addDir and one add event', async () => {
      // Arrange
      const syncRootPath = join(TEST_FILES, v4());
      const folder = join(syncRootPath, v4());
      const file = join(folder, `${v4()}.txt`);
      await setupWatcher(syncRootPath);

      // Act
      execSync(`mkdir ${folder}`);
      execSync(`echo. 2>${file}`);
      await sleep(50);

      // Assert
      expect(getEvents()).toEqual(['addDir', 'addDir', 'add']);
      expect(onAdd.execute).toHaveBeenCalledWith(expect.objectContaining({ path: file }));
      expect(onAddDir.execute).toHaveBeenCalledWith(expect.objectContaining({ path: folder }));
    });
  });

  describe('When rename items', () => {
    it('When rename a file, then do not emit any event', async () => {
      // Arrange
      const syncRootPath = join(TEST_FILES, v4());
      const fileName1 = `${v4()}.txt`;
      const fileName2 = `${v4()}.txt`;
      const file1 = join(syncRootPath, fileName1);
      await setupWatcher(syncRootPath);
      await writeFile(file1, 'Content');

      // Act
      execSync(`ren ${fileName1} ${fileName2}`, { cwd: syncRootPath });
      await sleep(50);

      // Assert
      expect(getEvents()).toEqual(['addDir', 'add']);
    });

    it('When rename a folder, then do not emit any event', async () => {
      // Arrange
      const syncRootPath = join(TEST_FILES, v4());
      const folderName1 = v4();
      const folderName2 = v4();
      const folder1 = join(syncRootPath, folderName1);
      await setupWatcher(syncRootPath);
      await mkdir(folder1);

      // Act
      execSync(`ren ${folderName1} ${folderName2}`, { cwd: syncRootPath });
      await sleep(50);

      // Assert
      expect(getEvents()).toEqual(['addDir', 'addDir']);
    });
  });

  describe('When move items', () => {
    it('When move a file to a folder, then do not emit any event', async () => {
      // Arrange
      const syncRootPath = join(TEST_FILES, v4());
      const folder = join(syncRootPath, v4());
      const file = join(syncRootPath, `${v4()}.txt`);
      await setupWatcher(syncRootPath);
      await mkdir(folder);
      await writeFile(file, 'Content');

      // Act
      execSync(`mv ${file} ${folder}`);
      await sleep(50);

      // Assert
      expect(getEvents()).toEqual(['addDir', 'addDir', 'add']);
    });

    it('When move a folder to a folder, then do not emit any event', async () => {
      // Arrange
      const syncRootPath = join(TEST_FILES, v4());
      const folder = join(syncRootPath, v4());
      const folderName = v4();
      const folder1 = join(syncRootPath, folderName);
      const folder2 = join(folder, folderName);
      await setupWatcher(syncRootPath);

      // Act
      await mkdir(folder);
      await mkdir(folder1);
      execSync(`mv ${folder1} ${folder2}`);
      await sleep(50);

      // Assert
      expect(getEvents()).toEqual(['addDir', 'addDir', 'addDir']);
    });
  });

  describe('When delete items', () => {
    it('When delete a file, then emit one unlink event', async () => {
      // Arrange
      const syncRootPath = join(TEST_FILES, v4());
      const file = join(syncRootPath, `${v4()}.txt`);
      await setupWatcher(syncRootPath);
      await writeFile(file, 'Content');

      // Act
      await sleep(50);
      execSync(`rm ${file}`);
      await sleep(150);

      // Assert
      expect(getEvents()).toEqual(['addDir', 'add', 'unlink']);
    });

    it('When delete a folder, then emit one unlinkDir event', async () => {
      // Arrange
      const syncRootPath = join(TEST_FILES, v4());
      const folder = join(syncRootPath, v4());
      await setupWatcher(syncRootPath);
      await mkdir(folder);

      // Act
      await sleep(50);
      execSync(`rmdir ${folder}`);
      await sleep(150);

      // Assert
      expect(getEvents()).toEqual(['addDir', 'addDir', 'unlinkDir']);
    });
  });

  describe('When pin items', () => {
    it.only('When pin a file, then emit one change event', async () => {
      // Arrange
      const file = join(syncRootPath, `${v4()}.txt`);
      await writeFile(file, 'Content');

      // Act
      await sleep(50);
      execSync(`attrib +P ${file}`);
      await sleep(500);

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('When pin a folder, then do not emit any event', async () => {
      // Arrange
      const syncRootPath = join(TEST_FILES, v4());
      const folder = join(syncRootPath, v4());
      await setupWatcher(syncRootPath);
      await mkdir(folder);

      // Act
      await sleep(50);
      execSync(`attrib +P ${folder}`);
      await sleep(50);

      // Assert
      expect(getEvents()).toEqual(['addDir', 'addDir']);
    });
  });
});
