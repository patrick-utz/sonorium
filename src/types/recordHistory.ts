export type RecordChangeType =
  | "created"
  | "updated"
  | "cover_changed"
  | "cover_verified"
  | "data_corrected"
  | "duplicated_record";

export interface RecordHistoryEntry {
  id: string;
  recordId: string;
  timestamp: string;
  changeType: RecordChangeType;
  changedBy: "system" | "user" | "ai";
  description: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: {
    source?: string;
    confidence?: "high" | "medium" | "low";
    reason?: string;
  };
}

/**
 * Helper to create history entries for record changes
 */
export function createHistoryEntry(
  recordId: string,
  changeType: RecordChangeType,
  description: string,
  changedBy: "system" | "user" | "ai" = "user",
  previousValue?: Record<string, any>,
  newValue?: Record<string, any>,
  metadata?: RecordHistoryEntry["metadata"]
): Omit<RecordHistoryEntry, "id"> {
  return {
    recordId,
    timestamp: new Date().toISOString(),
    changeType,
    changedBy,
    description,
    previousValue,
    newValue,
    metadata,
  };
}

/**
 * Format history entry for display
 */
export function formatHistoryEntry(entry: RecordHistoryEntry): string {
  const date = new Date(entry.timestamp).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const changedByLabel =
    entry.changedBy === "ai"
      ? "KI"
      : entry.changedBy === "system"
        ? "System"
        : "Benutzer";

  return `${date} - ${changedByLabel}: ${entry.description}`;
}
