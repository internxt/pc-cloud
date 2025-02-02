import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 } from 'uuid';

import { PinState, QueueHandler, QueueManager, QueueManagerCallback, SyncState, VirtualDrive } from 'virtual-drive/dist';
import { createVirtualDrive } from './create-virtual-drive.helper.test';
import { execSync } from 'child_process';
import { mockDeep } from 'vitest-mock-extended';
import { TEST_FILES } from '@/tests/jest/setup.helper.test';
import { sleep } from '@/apps/main/util';

describe('When click on always keep on this device', () => {
  let drive!: VirtualDrive;
  let syncRootPath!: string;

  beforeAll(async () => {
    const res = await createVirtualDrive();

    drive = res.drive;
    syncRootPath = res.syncRootPath;

    const notify = mockDeep<QueueManagerCallback>();
    const persistPath = join(TEST_FILES, `${v4()}.json`);
    const queueManager = new QueueManager(handlers, notify, persistPath);
    drive.watchAndWait(syncRootPath, queueManager, '');
  });

  it.only('When file is always keep on this device (greep), then convert to (white)', async () => {
    // Arrange
    await sleep(500);
    const id = v4();
    const path = join(syncRootPath, id);
    execSync(`echo 'Content' > ${path}`);
  });

  describe('Convert file to placeholder', () => {
    it('When hydrate a file, then ', async () => {
      // Arrange
      await sleep(500);
      const id = v4();
      const path = join(syncRootPath, id);
      execSync(`echo 'Content' > ${path}`);

      // Act
      await sleep(2000);
      console.log(queueManager.queues);
      // drive.convertToPlaceholder(path, id);
      // execSync(`attrib -P ${path}`);
      // const isCreated = drive.dehydrateFile(path);
      // console.log('🚀 ~ it.only ~ isCreated:', isCreated);
      const status = drive.getPlaceholderState(path);
      console.log('🚀 ~ it.only ~ status:', status);

      // Assert
      // expect(isCreated).toBe(true);
      // expect(status).toEqual({ pinState: PinState.AlwaysLocal, syncState: SyncState.InSync });
    });

    it('When trying to convert to placeholder two times it ignores the second time', async () => {
      // Arrange
      const id = v4();
      const path = join(syncRootPath, `${id}.txt`);
      await writeFile(path, 'Content');

      // Act
      const isCreated1 = drive.convertToPlaceholder(path, id);
      const isCreated2 = drive.convertToPlaceholder(path, id);
      const status = drive.getPlaceholderState(path);

      // Assert
      expect(isCreated1).toBe(true);
      expect(isCreated2).toBe(false);
      expect(status).toEqual({ pinState: PinState.AlwaysLocal, syncState: SyncState.InSync });
    });
  });

  describe('Convert folder to placeholder', () => {
    it('Creates the placeholder and sets the sync state to undefined', async () => {
      // Arrange
      const id = v4();
      const path = join(syncRootPath, id);
      await mkdir(path);

      // Act
      const isCreated = drive.convertToPlaceholder(path, id);
      const status = drive.getPlaceholderState(path);

      // Assert
      expect(isCreated).toBe(true);
      expect(status).toEqual({ pinState: PinState.Unspecified, syncState: SyncState.InSync });
    });

    it('When trying to convert to placeholder two times it ignores the second time', async () => {
      // Arrange
      const id = v4();
      const path = join(syncRootPath, id);
      await mkdir(path);

      // Act
      const isCreated1 = drive.convertToPlaceholder(path, id);
      const isCreated2 = drive.convertToPlaceholder(path, id);
      const status = drive.getPlaceholderState(path);

      // Assert
      expect(isCreated1).toBe(true);
      expect(isCreated2).toBe(false);
      expect(status).toEqual({ pinState: PinState.Unspecified, syncState: SyncState.InSync });
    });

    it('When create folder placeholder with a file inside, then set the sync state just for the folder', async () => {
      // Arrange
      const id = v4();
      const folderPath = join(syncRootPath, id);
      const filePath = join(folderPath, `${id}.txt`);
      await mkdir(folderPath);
      await writeFile(filePath, 'Content');

      // Act
      const isCreated = drive.convertToPlaceholder(folderPath, id);
      const folderStatus = drive.getPlaceholderState(folderPath);
      const fileStatus = drive.getPlaceholderState(filePath);

      // Assert
      expect(isCreated).toBe(true);
      expect(folderStatus).toEqual({ pinState: PinState.Unspecified, syncState: SyncState.InSync });
      expect(fileStatus).toEqual({ pinState: PinState.Unspecified, syncState: SyncState.Undefined });
    });
  });
});
