import { mockDeep } from 'vitest-mock-extended';
import { HandleAddService } from './handleAdd.service';
import { BindingsManager } from '../BindingManager';
import { DeepPartial } from 'ts-essentials';
import { join } from 'path';
import { v4 } from 'uuid';
import { PinState, SyncState } from 'virtual-drive/dist';
import { writeFile } from 'fs/promises';
import { createVirtualDrive } from './create-virtual-drive.helper.test';

type TObjectFunc = { run: (args: any) => unknown };
export const mockProps = <T extends TObjectFunc>(props: DeepPartial<Parameters<T['run']>[0]>) => props as Parameters<T['run']>[0];

describe('', () => {
  const { drive, syncRootPath } = createVirtualDrive();
  const self = mockDeep<BindingsManager>();
  const handleAdd = new HandleAddService();

  it('', async () => {
    // Arrange
    const id = `${v4()}.txt`;
    const path = join(syncRootPath, id);
    await writeFile(path, 'Content');

    self.controllers.addFile.execute.mockResolvedValue(id);

    // Act
    const props = mockProps<HandleAddService>({ self, drive, task: { path } });
    await handleAdd.run(props);

    // Assert
    const status = drive.getPlaceholderState(path);
    expect(status).toEqual({ pinState: PinState.AlwaysLocal, syncState: SyncState.InSync });
  });
});
