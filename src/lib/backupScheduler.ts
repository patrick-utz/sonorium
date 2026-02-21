/**
 * Backup Scheduler - Manages automatic and scheduled backups
 * Stores backup metadata in localStorage for easy access and history
 */

export type BackupFrequency = 'daily' | 'weekly' | 'monthly' | 'manual';

export interface BackupMetadata {
  id: string;
  timestamp: string;
  filename: string;
  recordCount: number;
  size: number; // File size in bytes
  frequency: BackupFrequency;
  notes?: string;
}

export interface BackupSchedulerState {
  enabled: boolean;
  frequency: BackupFrequency;
  lastBackupDate: string | null;
  backupHistory: BackupMetadata[];
  maxBackups: number; // Keep last N backups
}

const STORAGE_KEY = 'sonorium_backup_scheduler';
const HISTORY_KEY = 'sonorium_backup_history';
const DEFAULT_MAX_BACKUPS = 10;

/**
 * Initialize backup scheduler state
 */
export function initializeBackupScheduler(): BackupSchedulerState {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  const defaultState: BackupSchedulerState = {
    enabled: false,
    frequency: 'weekly',
    lastBackupDate: null,
    backupHistory: [],
    maxBackups: DEFAULT_MAX_BACKUPS,
  };

  saveBackupSchedulerState(defaultState);
  return defaultState;
}

/**
 * Save backup scheduler state to localStorage
 */
export function saveBackupSchedulerState(state: BackupSchedulerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Get current backup scheduler state
 */
export function getBackupSchedulerState(): BackupSchedulerState {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : initializeBackupScheduler();
}

/**
 * Check if a backup is due based on frequency
 */
export function isBackupDue(frequency: BackupFrequency, lastBackupDate: string | null): boolean {
  if (!lastBackupDate) return true;

  const last = new Date(lastBackupDate);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (frequency) {
    case 'daily':
      return diffDays >= 1;
    case 'weekly':
      return diffDays >= 7;
    case 'monthly':
      return diffDays >= 30;
    case 'manual':
      return false;
    default:
      return false;
  }
}

/**
 * Add backup to history
 */
export function addBackupToHistory(
  recordCount: number,
  filename: string,
  fileSize: number,
  frequency: BackupFrequency = 'manual'
): BackupMetadata {
  const state = getBackupSchedulerState();

  const backup: BackupMetadata = {
    id: `backup_${Date.now()}`,
    timestamp: new Date().toISOString(),
    filename,
    recordCount,
    size: fileSize,
    frequency,
  };

  // Add to history
  state.backupHistory.push(backup);

  // Keep only last N backups
  if (state.backupHistory.length > state.maxBackups) {
    state.backupHistory = state.backupHistory.slice(-state.maxBackups);
  }

  // Update last backup date
  state.lastBackupDate = backup.timestamp;

  // Save updated state
  saveBackupSchedulerState(state);

  return backup;
}

/**
 * Get backup history
 */
export function getBackupHistory(): BackupMetadata[] {
  const state = getBackupSchedulerState();
  return state.backupHistory;
}

/**
 * Get formatted backup size
 */
export function formatBackupSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Delete backup from history
 */
export function deleteBackupFromHistory(backupId: string): void {
  const state = getBackupSchedulerState();
  state.backupHistory = state.backupHistory.filter((b) => b.id !== backupId);
  saveBackupSchedulerState(state);
}

/**
 * Get time until next backup is due
 */
export function getTimeUntilNextBackup(frequency: BackupFrequency, lastBackupDate: string | null): string {
  if (!lastBackupDate) return 'Due now';

  const last = new Date(lastBackupDate);
  const now = new Date();

  let nextBackupDate: Date;

  switch (frequency) {
    case 'daily':
      nextBackupDate = new Date(last.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      nextBackupDate = new Date(last.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      nextBackupDate = new Date(last.getTime() + 30 * 24 * 60 * 60 * 1000);
      break;
    case 'manual':
      return 'Manual mode';
    default:
      return 'Unknown';
  }

  const diffMs = nextBackupDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil((diffMs / (1000 * 60 * 60)) % 24);

  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    return 'Due soon';
  }
}

/**
 * Format backup date for display
 */
export function formatBackupDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
