import { VirtualDrive } from 'virtual-drive/dist';
import { settings } from './settings';

export const drive = new VirtualDrive(settings.syncRootPath, settings.defaultLogPath);
