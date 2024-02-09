import { FileCreationOrchestrator } from '../../../../context/virtual-drive/boundaryBridge/application/FileCreationOrchestrator';
import { FileSyncOrchestrator } from '../../../../context/virtual-drive/boundaryBridge/application/FileSyncOrchestrator';

export interface BoundaryBridgeContainer {
  fileCreationOrchestrator: FileCreationOrchestrator;
  fileSyncOrchestrator: FileSyncOrchestrator;
}
