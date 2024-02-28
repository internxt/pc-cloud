import { RetryContentsUploader } from '../../contents/application/RetryContentsUploader';
import { FileSynchronizer } from '../../files/application/FileSyncronizer';

export class FileSyncOrchestrator {
  constructor(
    private readonly contentsUploader: RetryContentsUploader,
    private readonly fileSyncronizer: FileSynchronizer
  ) {}

  async run(absolutePaths: string[]): Promise<void> {
    for (const absolutePath of absolutePaths) {
      await this.fileSyncronizer.run(
        absolutePath,
        this.contentsUploader.run.bind(this.contentsUploader)
      );
    }
  }
}
