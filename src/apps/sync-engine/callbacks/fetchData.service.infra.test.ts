import { v4 } from 'uuid';
import { createVirtualDrive } from './create-virtual-drive.helper.test';
import { join } from 'path';
import { stat, writeFile } from 'fs/promises';
import { execSync } from 'child_process';

describe('', () => {
  const { drive, syncRootPath } = createVirtualDrive();

  it('', async () => {
    // Arrange
    const id = `${v4()}.txt`;
    const path = join(syncRootPath, id);
    await writeFile(path, 'Content');

    // Act
    drive.convertToPlaceholder(path, id);
    drive.updateSyncStatus(path, false, false);
    // execSync(`attrib +P -U ${path} /S /D`);
    const res = drive.dehydrateFile(path);
    const state = drive.getPlaceholderState(path);
    const attribute = drive.getPlaceholderAttribute(path);
    drive.dehydrateFile(path);
    console.log('🚀 ~ it ~ state:', state);
    console.log('🚀 ~ it ~ attribute:', attribute);
  });
});
