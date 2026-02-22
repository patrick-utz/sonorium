import React, { createContext, useContext, ReactNode } from "react";
import { Record } from "@/types/record";
import { useRecordsSync } from "@/hooks/useRecordsSync";

interface RecordContextType {
  records: Record[];
  loading: boolean;
  syncing: boolean;
  addRecord: (record: Omit<Record, "id" | "dateAdded">) => Promise<void>;
  updateRecord: (id: string, updates: Partial<Record>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  getRecordById: (id: string) => Record | undefined;
  getOwnedRecords: () => Record[];
  getWishlistRecords: () => Record[];
  getFavoriteRecords: () => Record[];
  toggleFavorite: (id: string) => Promise<void>;
  toggleOrdered: (id: string) => Promise<void>;
  importRecords: (records: Record[], mode: "merge" | "replace") => Promise<void>;
  refreshRecords: () => Promise<void>;
}

const RecordContext = createContext<RecordContextType | undefined>(undefined);

export function RecordProvider({ children }: { children: ReactNode }) {
  const {
    records,
    loading,
    syncing,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordById,
    getOwnedRecords,
    getWishlistRecords,
    getFavoriteRecords,
    toggleFavorite,
    toggleOrdered,
    importRecords,
    refetch,
  } = useRecordsSync();

  return (
    <RecordContext.Provider
      value={{
        records,
        loading,
        syncing,
        addRecord,
        updateRecord,
        deleteRecord,
        getRecordById,
        getOwnedRecords,
        getWishlistRecords,
        getFavoriteRecords,
        toggleFavorite,
        toggleOrdered,
        importRecords,
        refreshRecords: refetch,
      }}
    >
      {children}
    </RecordContext.Provider>
  );
}

export function useRecords() {
  const context = useContext(RecordContext);
  if (!context) {
    throw new Error("useRecords must be used within a RecordProvider");
  }
  return context;
}
