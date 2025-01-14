import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { app } from 'electron';
import net from 'net';
import path from 'path';

const SERVER_HOST = '127.0.0.1';
const SERVER_PORT = 3310;

let clamdProcess: ChildProcessWithoutNullStreams | null = null;
const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'clamAV')
  : path.join(__dirname, '../../../../clamAV');

const startClamdServer = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const clamdPath = path.join(RESOURCES_PATH, 'clamd.exe');
    const clamdConfigPath = path.join(RESOURCES_PATH, 'clamd.conf');
    const freshclamPath = path.join(RESOURCES_PATH, 'freshclam.exe');

    console.log('Updating virus database using freshclam...', freshclamPath);

    clamdProcess = spawn(clamdPath, ['-c', clamdConfigPath]);

    clamdProcess.stdout.on('data', (data) => {
      console.log(`[clamd stdout]: ${data}`);
    });

    clamdProcess.stderr.on('data', (data) => {
      console.error(`[clamd stderr]: ${data}`);
      reject();
    });

    clamdProcess.on('close', (code) => {
      console.log(`clamd server exited with code ${code}`);
      clamdProcess = null;
    });

    clamdProcess.on('error', (error) => {
      console.error('Failed to start clamd server:', error);
      reject();
    });

    // const freshclamProcess = spawn(freshclamPath);

    // freshclamProcess.stdout.on('data', (data) => {
    //   console.log(`[freshclam stdout]: ${data}`);
    // });

    // freshclamProcess.stderr.on('data', (data) => {
    //   console.error(`[freshclam stderr]: ${data}`);
    // });

    // freshclamProcess.on('error', (error) => {
    //   console.log('Failed to start freshclam:', error);
    //   reject();
    // });

    // freshclamProcess.on('close', (code) => {
    //   if (code === 0) {
    //     console.log(
    //       'Virus database updated successfully...\n Starting clamd server...'
    //     );

    //     resolve();
    //   } else {
    //     console.error(`freshclam exited with code ${code}`);
    //     reject(new Error('Failed to update virus database.'));
    //   }
    // });
    resolve();
  });
};

const stopClamdServer = (): void => {
  if (clamdProcess) {
    console.log('Stopping clamd server...');
    clamdProcess.kill();
    clamdProcess = null;
  }
};

const checkClamdAvailability = (
  host = SERVER_HOST,
  port = SERVER_PORT
): Promise<boolean> => {
  return new Promise((resolve) => {
    const client = new net.Socket();

    client.connect(port, host, () => {
      client.end();
      resolve(true);
    });

    client.on('error', () => {
      client.destroy();
      resolve(false);
    });
  });
};

const waitForClamd = async (
  timeout = 60000,
  interval = 5000
): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const isAvailable = await checkClamdAvailability();
    if (isAvailable) {
      return;
    }
    console.log('Waiting for clamd server to become available...');
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for clamd server to become available');
};

const clamAVServer = {
  startClamdServer,
  stopClamdServer,
  waitForClamd,
};

export default clamAVServer;
