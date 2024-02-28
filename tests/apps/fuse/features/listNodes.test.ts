import { FuseApp } from '../../../../src/apps/fuse/FuseApp';
import { FuseDependencyContainer } from '../../../../src/apps/fuse/dependency-injection/FuseDependencyContainer';
import fs from 'fs/promises';

describe('List Nodes', () => {
  let app: FuseApp | null = null;

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

    const container = {} as FuseDependencyContainer;
    app = new FuseApp(container, {
      root: '/tmp/internxt-fuse-test-root',
      local: '/tmp/internxt-fuse-test-local',
    });

    await app.start();
  });

  afterAll(async () => {
    await app?.stop();
  });

  it('works', async () => {
    const nodes = await fs.readdir(root);

    expect(nodes).toBe(['.', '..']);
  });
});
