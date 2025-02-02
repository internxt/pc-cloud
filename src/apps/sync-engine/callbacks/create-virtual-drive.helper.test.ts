import { TEST_FILES } from '@/tests/jest/setup.helper.test';
import { join } from 'path';
import { cwd } from 'process';
import { v4 } from 'uuid';
import { Callbacks, VirtualDrive } from 'virtual-drive/dist';

export const createVirtualDrive = async () => {
  const syncRootPath = join(TEST_FILES, v4());
  const defaultLogPath = join(TEST_FILES, `${v4()}.log`);
  const drive = new VirtualDrive(syncRootPath, defaultLogPath);

  const callback = vi.fn();
  const callbacks: Callbacks = {
    fetchDataCallback: callback,
    notifyDeleteCallback: callback,
    notifyRenameCallback: callback,
    notifyMessageCallback: callback,
    cancelFetchDataCallback: callback,
  };

  const driveName = 'Internxt';
  const driveVersion = '2.0.4';
  const defaultIconPath = join(cwd(), 'assets', 'icon.ico');
  const providerId = '{12345678-1234-1234-1234-123456789012}';
  await drive.registerSyncRoot(driveName, driveVersion, providerId, callbacks, defaultIconPath);
  drive.connectSyncRoot();

  return { drive, syncRootPath, callback };
};
