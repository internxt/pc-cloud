import { FuseApp } from '../../../../src/apps/fuse/FuseApp';
import { FuseDependencyContainer } from '../../../../src/apps/fuse/dependency-injection/FuseDependencyContainer';
import fs from 'fs/promises';

describe('Start Fuse App', () => {
  const root = '/tmp/internxt-fuse-test-root';
  const local = '/tmp/internxt-fuse-test-local';

  const ensureFolderAreCreated = async (folder: string) => {
    try {
      await fs.stat(folder);
      await fs.mkdir(folder);
    } catch {
      // no-op
    }
  };

  beforeAll(async () => {
    await ensureFolderAreCreated(root);
    await ensureFolderAreCreated(local);
  });

  it('starts and stops successfully', async () => {
    const container = {} as FuseDependencyContainer;
    const app = new FuseApp(container, {
      root: '/tmp/internxt-fuse-test-root',
      local: '/tmp/internxt-fuse-test-local',
    });

    await app.start();
    await app.stop();
  });
});
