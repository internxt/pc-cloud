import Logger from 'electron-log';
import { Service } from 'diod';
import { UserUsageRepository } from '../domain/UserUsageRepository';

@Service()
export class UserAvaliableSpaceValidator {
  constructor(private readonly repository: UserUsageRepository) {}

  async run(desiredSpaceToUse: number): Promise<boolean> {
    const usage = await this.repository.getUsage();

    Logger.info(
      `Checking if user has enough space to use ${desiredSpaceToUse} bytes. User has ${usage.free()} bytes available.`
    );

    return desiredSpaceToUse < usage.free();
  }
}
