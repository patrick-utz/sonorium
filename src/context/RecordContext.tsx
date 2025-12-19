import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Record } from "@/types/record";
import { sampleRecords } from "@/data/sampleRecords";

interface RecordContextType {
  records: Record[];
  addRecord: (record: Omit<Record, "id" | "dateAdded">) => void;
  updateRecord: (id: string, updates: Partial<Record>) => void;
  deleteRecord: (id: string) => void;
  getRecordById: (id: string) => Record | undefined;
  getOwnedRecords: () => Record[];
  getWishlistRecords: () => Record[];
  importRecords: (records: Record[], mode: "merge" | "replace") => void;
}

const RecordContext = createContext<RecordContextType | undefined>(undefined);

export function RecordProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record[]>(() => {
    const stored = localStorage.getItem("vinylvault-records");
    if (stored) {
      return JSON.parse(stored);
    }
    return sampleRecords;
  });

  useEffect(() => {
    try {
      localStorage.setItem("vinylvault-records", JSON.stringify(records));
    } catch (e) {
      console.warn("localStorage quota exceeded, data not saved:", e);
    }
  }, [records]);

  const addRecord = (record: Omit<Record, "id" | "dateAdded">) => {
    const newRecord: Record = {
      ...record,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString().split("T")[0],
    };
    setRecords((prev) => [newRecord, ...prev]);
  };

  const updateRecord = (id: string, updates: Partial<Record>) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === id ? { ...record, ...updates } : record
      )
    );
  };

  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== id));
  };

  const getRecordById = (id: string) => {
    return records.find((record) => record.id === id);
  };

  const getOwnedRecords = () => {
    return records.filter((record) => record.status === "owned");
  };

  const getWishlistRecords = () => {
    return records.filter((record) => record.status === "wishlist");
  };

  const importRecords = (importedRecords: Record[], mode: "merge" | "replace") => {
    if (mode === "replace") {
      setRecords(importedRecords);
    } else {
      // Merge: add imported records, skip duplicates by id
      const existingIds = new Set(records.map((r) => r.id));
      const newRecords = importedRecords.filter((r) => !existingIds.has(r.id));
      setRecords((prev) => [...newRecords, ...prev]);
    }
  };

  return (
    <RecordContext.Provider
      value={{
        records,
        addRecord,
        updateRecord,
        deleteRecord,
        getRecordById,
        getOwnedRecords,
        getWishlistRecords,
        importRecords,
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
