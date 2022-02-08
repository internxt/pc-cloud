import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UilHistory, UilMultiply } from '@iconscout/react-unicons';
import FileIcon from '../../assets/file.svg';
import Success from '../../assets/success.svg';
import Warn from '../../assets/warn.svg';
import Error from '../../assets/error.svg';
import FileWithOperation, {
  Operation,
} from '../../components/FileWithOperation';
import useSyncStatus from '../../hooks/SyncStatus';
import { shortMessages } from '../../messages/process-error';
import { getBaseName } from '../../utils/path';
import useSyncStopped from '../../hooks/SyncStopped';
import {
  ProcessErrorName,
  ProcessInfoUpdatePayload,
} from '../../../workers/types';
import { SyncStatus } from '../../../main/background-processes/sync';
import useBackupStatus from '../../hooks/BackupStatus';
import useBackupFatalErrors from '../../hooks/BackupFatalErrors';
import useProcessIssues from '../../hooks/ProcessIssues';
import {
  BackupExitReason,
  BackupProgress,
} from '../../../main/background-processes/backups';

export default function SyncInfo() {
  const [items, setItems] = useState<ProcessInfoUpdatePayload[]>([]);

  const [syncStopped] = useSyncStopped();

  useEffect(() => {
    const removeListener = window.electron.onSyncInfoUpdate(onSyncItem);
    return removeListener;
  }, []);

  function onSyncStatusChanged(value: SyncStatus) {
    if (value === 'RUNNING') clearItems();
  }

  useSyncStatus(onSyncStatusChanged);

  function onSyncItem(item: ProcessInfoUpdatePayload) {
    const MAX_ITEMS = 50;

    setItems((currentItems) => {
      const itemsWithoutGivenItem = currentItems.filter(
        (i) => i.name !== item.name
      );

      const itemIsAnError = [
        'PULL_ERROR',
        'RENAME_ERROR',
        'DELETE_ERROR',
        'METADATA_READ_ERROR',
      ].includes(item.action);

      const newItems = itemIsAnError
        ? itemsWithoutGivenItem
        : [item, ...itemsWithoutGivenItem].slice(0, MAX_ITEMS);

      return newItems;
    });
  }

  function clearItems() {
    setItems([]);
  }

  function removeOnProgressItems() {
    setItems((currentItems) => {
      return currentItems.filter(
        (item) =>
          item.action !== 'DELETE' &&
          item.action !== 'PULL' &&
          item.action !== 'RENAME'
      );
    });
  }

  useEffect(() => {
    if (syncStopped) removeOnProgressItems();
  }, [syncStopped]);

  return (
    <div className="relative min-h-0 flex-grow border-t border-t-l-neutral-30 bg-l-neutral-10">
      <div className="absolute top-0 left-0 flex w-full justify-end p-1">
        <div className="rounded bg-l-neutral-10 px-2">
          <button
            tabIndex={0}
            type="button"
            className={`select-none text-xs font-medium text-blue-60 hover:text-blue-70 active:text-blue-80 ${
              items.length === 0 ? 'opacity-0' : ''
            }`}
            onClick={clearItems}
            disabled={items.length === 0}
          >
            Clear
          </button>
        </div>
      </div>
      <BackupsBanner />
      {items.length === 0 && <Empty />}
      <div className="scroll no-scrollbar h-full overflow-y-auto">
        <AnimatePresence>
          {items.map((item, i) => (
            <AnimationWrapper key={item.name} i={i}>
              <Item {...item} />
            </AnimationWrapper>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AnimationWrapper({
  children,
  key,
  i,
}: {
  children: ReactNode;
  key: string;
  i: number;
}) {
  return (
    <motion.div
      key={key}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { delay: i * 0.03 } }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

function Item({
  name,
  action,
  kind,
  progress,
  errorName,
}: ProcessInfoUpdatePayload & {
  progress?: number;
  errorName?: ProcessErrorName;
}) {
  const progressDisplay =
    progress !== undefined ? `${(progress * 100).toFixed(0)}%` : '';

  let operation: Operation | undefined;
  if (action === 'DELETE' || action === 'DELETED' || action === 'DELETE_ERROR')
    operation = 'delete';
  else if (action === 'PULL' || action === 'PULLED' || action === 'PULL_ERROR')
    operation = kind === 'LOCAL' ? 'download' : 'upload';

  let description = '';

  if (action === 'PULL' && kind === 'LOCAL') description = 'Downloading';
  else if (action === 'PULL' && kind === 'REMOTE') description = 'Uploading';
  else if (action === 'PULLED' && kind === 'LOCAL') description = 'Downloaded';
  else if (action === 'PULLED' && kind === 'REMOTE') description = 'Uploaded';
  else if (action === 'DELETE' && kind === 'LOCAL')
    description = 'Deleting from your computer';
  else if (action === 'DELETE' && kind === 'REMOTE')
    description = 'Deleting from Internxt Drive';
  else if (action === 'DELETED' && kind === 'LOCAL')
    description = 'Deleted from your computer';
  else if (action === 'DELETED' && kind === 'REMOTE')
    description = 'Deleted from Internxt Drive';
  else if (errorName) description = shortMessages[errorName];

  const displayName = getBaseName(name);

  return (
    <div className="my-4 flex h-10 w-full select-none items-center overflow-hidden px-3">
      <FileWithOperation
        operation={operation}
        className="flex-shrink-0"
        width={24}
      />
      <div className="ml-4 overflow-hidden">
        <h2 className="truncate text-sm font-medium text-neutral-700">
          {displayName}
        </h2>
        <p className="text-xs text-neutral-500">
          {description}
          <span>&nbsp;{progressDisplay}</span>
        </p>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.4 } }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <div className="trasform absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 select-none text-center">
          <div className="relative h-16">
            <div className="absolute left-1/2 -translate-x-6 rotate-12 transform opacity-60">
              <FileIcon className="h-16 w-16" />
            </div>
            <div className="absolute left-1/2 -translate-x-10 -rotate-12 transform">
              <FileIcon className="h-16 w-16" />
            </div>
          </div>
          <p className="mt-7 text-sm text-blue-100">
            There is no recent activity
          </p>
          <p className="mt-1 px-4 text-xs text-m-neutral-100">
            Information will show up here when changes are made to sync your
            local folder with Internxt Drive
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function BackupsBanner() {
  const status = useBackupStatus();
  const fatalErrors = useBackupFatalErrors();
  const issues = useProcessIssues().filter(
    (issue) => issue.process === 'BACKUPS'
  );

  const [backupProgress, setBackupProgress] = useState<null | BackupProgress>(
    null
  );

  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
  }, [status]);

  const [lastExit, setLastExit] = useState<null | BackupExitReason>(null);

  useEffect(() => {
    const removeListener = window.electron.onBackupProgress(setBackupProgress);

    return removeListener;
  }, []);

  useEffect(() => {
    window.electron.getLastBackupExitReason().then(setLastExit);
  }, [status]);

  let body = '';
  let percentage = '';

  if (status === 'RUNNING' && backupProgress) {
    body = `Backed up ${backupProgress.currentFolder - 1} out of ${
      backupProgress.totalFolders
    }`;

    const partialProgress = backupProgress.totalItems
      ? backupProgress.currentItems! / backupProgress.totalItems
      : 0;
    const totalProgress =
      (backupProgress.currentFolder - 1 + partialProgress) /
      backupProgress.totalFolders;
    percentage = `${(totalProgress * 100).toFixed(0)}%`;
  } else if (fatalErrors.length) {
    body = 'At least one of your backups failed';
  } else if (issues.length) {
    body = 'Backup completed with issues';
  } else if (lastExit === 'FORCED_BY_USER') {
    body = 'Backup stopped';
  } else {
    body = `Backed up ${backupProgress?.totalFolders} folders`;
  }

  let iconVariant: 'SUCCESS' | 'WARNING' | 'ERROR' | undefined;

  if (
    status === 'STANDBY' &&
    issues.length === 0 &&
    fatalErrors.length === 0 &&
    lastExit === 'PROCESS_FINISHED'
  )
    iconVariant = 'SUCCESS';
  else if (fatalErrors.length) iconVariant = 'ERROR';
  else if (issues.length) iconVariant = 'WARNING';

  return (
    <>
      {(status !== 'STANDBY' || backupProgress) && !hidden ? (
        <div className="group relative mt-8 flex h-14 w-full select-none items-center bg-blue-10 px-3">
          <BackupsIcon variant={iconVariant} />
          <div className="ml-3">
            <h1 className="text-sm font-medium text-neutral-700">Backup</h1>
            <p className="text-xs font-medium text-neutral-500">
              {body} <span className="text-neutral-500/50">{percentage}</span>
            </p>
          </div>
          <UilMultiply
            onClick={() => setHidden(true)}
            className={`absolute top-1/2 right-5 hidden h-5 w-5 -translate-y-1/2 cursor-pointer text-neutral-500/50 ${
              status === 'STANDBY' ? 'group-hover:block' : ''
            }`}
          />
        </div>
      ) : (
        <div />
      )}
    </>
  );
}

function BackupsIcon({
  variant,
}: {
  variant?: 'SUCCESS' | 'WARNING' | 'ERROR';
}) {
  return (
    <div className="relative">
      <UilHistory className="h-6 w-6 text-blue-60" />
      {variant === 'SUCCESS' && (
        <>
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-white" />
          <Success className="absolute bottom-0 right-0 h-3 w-3 " />
        </>
      )}
      {variant === 'WARNING' && (
        <Warn className="absolute bottom-0 right-0 h-3 w-3 " />
      )}
      {variant === 'ERROR' && (
        <Error className="absolute bottom-0 right-0 h-3 w-3 " />
      )}
    </div>
  );
}
