import { useState, useRef, useEffect } from "react";
import type * as XLSX from "xlsx";
import { useRecords } from "@/context/RecordContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, FileText, Check, Save, Upload, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Record } from "@/types/record";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BackupSchedulerUI } from "@/components/BackupSchedulerUI";
import { BackupHistoryUI } from "@/components/BackupHistoryUI";
import {
  getBackupSchedulerState,
  saveBackupSchedulerState,
  addBackupToHistory,
  deleteBackupFromHistory,
} from "@/lib/backupScheduler";
import type { BackupMetadata } from "@/lib/backupScheduler";

const exportFields = [
  { id: "artist", label: "Künstler", default: true },
  { id: "album", label: "Album", default: true },
  { id: "year", label: "Jahr", default: true },
  { id: "genre", label: "Genre", default: true },
  { id: "label", label: "Label", default: true },
  { id: "catalogNumber", label: "Katalognummer", default: true },
  { id: "format", label: "Format", default: true },
  { id: "formatDetails", label: "Format-Details", default: false },
  { id: "pressing", label: "Pressung", default: false },
  { id: "myRating", label: "Eigene Bewertung", default: true },
  { id: "recordingQuality", label: "Aufnahmequalität", default: false },
  { id: "masteringQuality", label: "Mastering-Qualität", default: false },
  { id: "artisticRating", label: "Künstlerische Bewertung", default: false },
  { id: "criticScore", label: "Kritiker-Score", default: false },
  { id: "status", label: "Status", default: true },
  { id: "dateAdded", label: "Hinzugefügt am", default: true },
  { id: "purchaseDate", label: "Kaufdatum", default: false },
  { id: "purchasePrice", label: "Kaufpreis", default: false },
  { id: "purchaseLocation", label: "Kaufort", default: false },
  { id: "vinylRecommendation", label: "Vinyl-Empfehlung", default: false },
  { id: "personalNotes", label: "Notizen", default: false },
];

export default function Export() {
  const { records, importRecords } = useRecords();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFields, setSelectedFields] = useState<string[]>(
    exportFields.filter((f) => f.default).map((f) => f.id)
  );
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingImport, setPendingImport] = useState<Record[] | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [backupSchedulerState, setBackupSchedulerState] = useState(
    getBackupSchedulerState()
  );

  // Initialize backup scheduler on component mount
  useEffect(() => {
    const state = getBackupSchedulerState();
    setBackupSchedulerState(state);
  }, []);

  const handleBackupSchedulerChange = (newState: typeof backupSchedulerState) => {
    saveBackupSchedulerState(newState);
    setBackupSchedulerState(newState);
  };

  const handleDeleteBackup = (backupId: string) => {
    deleteBackupFromHistory(backupId);
    const updatedState = getBackupSchedulerState();
    setBackupSchedulerState(updatedState);
    toast({
      title: "Sicherung gelöscht",
      description: "Die Sicherung wurde aus dem Verlauf entfernt.",
    });
  };

  const handleRestoreBackup = (backup: BackupMetadata) => {
    // Find the backup in history and suggest restoring it
    toast({
      title: "Sicherung wiederherstellen",
      description: `${backup.recordCount} Tonträger aus ${backup.filename} werden wiederhergestellt.`,
    });
    // The actual restore happens via file selection
    fileInputRef.current?.click();
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((f) => f !== fieldId) : [...prev, fieldId]
    );
  };

  const selectAll = () => {
    setSelectedFields(exportFields.map((f) => f.id));
  };

  const selectNone = () => {
    setSelectedFields([]);
  };

  const prepareExportData = () => {
    return records.map((record) => {
      const row: globalThis.Record<string, any> = {};
      selectedFields.forEach((field) => {
        const value = record[field as keyof typeof record];
        if (field === "genre" && Array.isArray(value)) {
          row[field] = value.join(", ");
        } else if (field === "status") {
          const statusMap = {
            owned: "In Sammlung",
            wishlist: "Wunschliste",
            "checked-not-bought": "Geprüft",
          };
          row[field] = statusMap[value as keyof typeof statusMap] || value;
        } else if (field === "vinylRecommendation") {
          const recMap = {
            "must-have": "Must-Have",
            "nice-to-have": "Nice-to-Have",
            "stream-instead": "Streamen reicht",
          };
          row[field] = recMap[value as keyof typeof recMap] || value;
        } else {
          row[field] = value || "";
        }
      });
      return row;
    });
  };

  const getFieldLabels = () => {
    const labels: globalThis.Record<string, string> = {};
    exportFields.forEach((f) => {
      labels[f.id] = f.label;
    });
    return labels;
  };

  const exportToExcel = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: "Keine Felder ausgewählt",
        description: "Wähle mindestens ein Feld zum Exportieren aus.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Dynamically import xlsx only when needed
      const XLSX = (await import("xlsx")) as typeof import("xlsx");

      const data = prepareExportData();
      const labels = getFieldLabels();

      // Transform data to use German labels as headers
      const transformedData = data.map((row) => {
        const newRow: globalThis.Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          newRow[labels[key] || key] = row[key];
        });
        return newRow;
      });

      const ws = XLSX.utils.json_to_sheet(transformedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sammlung");

      // Auto-size columns
      const colWidths = Object.keys(transformedData[0] || {}).map((key) => ({
        wch: Math.max(key.length, 15),
      }));
      ws["!cols"] = colWidths;

      XLSX.writeFile(wb, `SONORIUM_Export_${new Date().toISOString().split("T")[0]}.xlsx`);

      toast({
        title: "Export erfolgreich",
        description: `${records.length} Tonträger wurden exportiert.`,
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Export-Fehler",
        description: "Der Excel-Export konnte nicht durchgeführt werden.",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    if (selectedFields.length === 0) {
      toast({
        title: "Keine Felder ausgewählt",
        description: "Wähle mindestens ein Feld zum Exportieren aus.",
        variant: "destructive",
      });
      return;
    }

    const data = prepareExportData();
    const labels = getFieldLabels();

    // Create CSV content
    const headers = selectedFields.map((f) => labels[f]).join(";");
    const rows = data.map((row) =>
      selectedFields
        .map((f) => {
          const value = row[f];
          // Escape quotes and wrap in quotes if contains special chars
          if (typeof value === "string" && (value.includes(";") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(";")
    );

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SONORIUM_Export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export erfolgreich",
      description: `${records.length} Tonträger wurden exportiert.`,
    });
  };

  // Export top-rated Vinyl albums (4-5 stars) for quick reference
  const exportTopRatedAlbums = async () => {
    const topRatedRecords = records.filter(
      (r) => r.myRating && r.myRating >= 4 && r.format === "vinyl"
    );

    if (topRatedRecords.length === 0) {
      toast({
        title: "Keine Top-Vinyl gefunden",
        description: "Du hast noch keine Vinyl-Alben mit 4 oder 5 Sternen bewertet.",
        variant: "destructive",
      });
      return;
    }

    try {
      const XLSX = (await import("xlsx")) as typeof import("xlsx");

      const data = topRatedRecords.map((record) => ({
        Künstler: record.artist,
        Album: record.album,
        Pressung: record.pressing || record.formatDetails || "—",
        Katalognummer: record.catalogNumber || "—",
        Verlag: record.label || "—",
        Jahr: record.year,
        Bewertung: "⭐".repeat(record.myRating || 0),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Top-Vinyl");

      // Auto-size columns
      const colWidths = [
        { wch: 25 }, // Künstler
        { wch: 30 }, // Album
        { wch: 25 }, // Pressung
        { wch: 18 }, // Katalognummer
        { wch: 20 }, // Verlag
        { wch: 8 },  // Jahr
        { wch: 12 }, // Bewertung
      ];
      ws["!cols"] = colWidths;

      XLSX.writeFile(wb, `SONORIUM_TopVinyl_${new Date().toISOString().split("T")[0]}.xlsx`);

      toast({
        title: "Export erfolgreich",
        description: `${topRatedRecords.length} Top-Vinyl (4-5 Sterne) wurden exportiert.`,
      });
    } catch (error) {
      console.error("Top vinyl export error:", error);
      toast({
        title: "Export-Fehler",
        description: "Der Export der Top-Vinyl konnte nicht durchgeführt werden.",
        variant: "destructive",
      });
    }
  };

  // Export 5-star Wishlist albums for family/friends (gifts)
  const exportWishlistFavorites = async () => {
    const wishlistFavorites = records.filter(
      (r) => r.status === "wishlist" && r.isFavorite === true && r.isOrdered !== true
    );

    if (wishlistFavorites.length === 0) {
      toast({
        title: "Keine Favoriten-Alben gefunden",
        description: "Du hast noch keine favorisierten Alben ohne Bestellung auf deiner Wunschliste.",
        variant: "destructive",
      });
      return;
    }

    try {
      const XLSX = (await import("xlsx")) as typeof import("xlsx");

      const data = wishlistFavorites.map((record) => ({
        Künstler: record.artist,
        Album: record.album,
        Format: record.format ? record.format.charAt(0).toUpperCase() + record.format.slice(1) : "—",
        Pressung: record.pressing || record.formatDetails || "—",
        Label: record.label || "—",
        Katalognummer: record.catalogNumber || "—",
        Jahr: record.year,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Wunschliste");

      // Auto-size columns
      const colWidths = [
        { wch: 25 }, // Künstler
        { wch: 30 }, // Album
        { wch: 10 }, // Format
        { wch: 25 }, // Pressung
        { wch: 20 }, // Label
        { wch: 18 }, // Katalognummer
        { wch: 8 },  // Jahr
      ];
      ws["!cols"] = colWidths;

      XLSX.writeFile(wb, `SONORIUM_Wunschliste_${new Date().toISOString().split("T")[0]}.xlsx`);

      toast({
        title: "Export erfolgreich",
        description: `${wishlistFavorites.length} Favoriten-Alben (ohne Bestellung) für deine Familie wurden exportiert.`,
      });
    } catch (error) {
      console.error("Wishlist export error:", error);
      toast({
        title: "Export-Fehler",
        description: "Der Export der Wunschliste konnte nicht durchgeführt werden.",
        variant: "destructive",
      });
    }
  };

  // Backup functions
  const createBackup = () => {
    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      records: records,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const filename = `SONORIUM_Backup_${new Date().toISOString().split("T")[0]}.json`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    // Add to backup history
    const newBackup = addBackupToHistory(
      records.length,
      filename,
      blob.size,
      backupSchedulerState.frequency
    );

    // Update backup scheduler state
    const updatedState = getBackupSchedulerState();
    setBackupSchedulerState(updatedState);

    toast({
      title: "Sicherung erstellt",
      description: `${records.length} Tonträger wurden gesichert.`,
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content);

        if (!backup.records || !Array.isArray(backup.records)) {
          throw new Error("Ungültiges Backup-Format");
        }

        setPendingImport(backup.records);
        setShowImportDialog(true);
      } catch (error) {
        toast({
          title: "Fehler beim Lesen",
          description: "Die Datei konnte nicht gelesen werden. Stelle sicher, dass es sich um eine gültige Backup-Datei handelt.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;

    importRecords(pendingImport, importMode);
    
    toast({
      title: "Import erfolgreich",
      description: importMode === "replace" 
        ? `${pendingImport.length} Tonträger wurden importiert (Sammlung ersetzt).`
        : `${pendingImport.length} Tonträger wurden zur Sammlung hinzugefügt.`,
    });

    setPendingImport(null);
    setShowImportDialog(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold gradient-text flex items-center gap-3">
          <Download className="w-8 h-8 text-primary" />
          Export & Sicherung
        </h1>
        <p className="text-muted-foreground mt-1">
          Exportiere oder sichere deine Sammlung
        </p>
      </div>

      {/* Stats */}
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-foreground">
              {records.length}
            </p>
            <p className="text-muted-foreground">Tonträger in der Sammlung</p>
          </div>
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Datenexport</CardTitle>
          <CardDescription>
            Exportiere deine Top-Alben als Excel-Listen für Sammlung und Wunschliste, oder erstelle eine Sicherung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              className="bg-background/50 border-border/50 cursor-pointer hover:shadow-vinyl transition-shadow"
              onClick={exportTopRatedAlbums}
            >
              <CardContent className="p-4 text-center">
                <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <h3 className="font-semibold mb-1">Top-Vinyl exportieren</h3>
                <p className="text-xs text-muted-foreground">
                  4-5 Sterne Sammlung
                </p>
              </CardContent>
            </Card>

            <Card
              className="bg-background/50 border-border/50 cursor-pointer hover:shadow-vinyl transition-shadow"
              onClick={exportWishlistFavorites}
            >
              <CardContent className="p-4 text-center">
                <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-blue-500" />
                <h3 className="font-semibold mb-1">Wunschliste exportieren</h3>
                <p className="text-xs text-muted-foreground">
                  Nur Favoriten ohne 📦
                </p>
              </CardContent>
            </Card>

            <Card
              className="bg-background/50 border-border/50 cursor-pointer hover:shadow-vinyl transition-shadow"
              onClick={createBackup}
            >
              <CardContent className="p-4 text-center">
                <Save className="w-10 h-10 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Sicherung erstellen</h3>
                <p className="text-xs text-muted-foreground">
                  Alle Daten als JSON speichern
                </p>
              </CardContent>
            </Card>

            <Card
              className="bg-background/50 border-border/50 cursor-pointer hover:shadow-vinyl transition-shadow"
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="p-4 text-center">
                <Upload className="w-10 h-10 mx-auto mb-2 text-accent" />
                <h3 className="font-semibold mb-1">Sicherung laden</h3>
                <p className="text-xs text-muted-foreground">
                  Frühere Sicherung wiederherstellen
                </p>
              </CardContent>
            </Card>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Backup Scheduler */}
      <BackupSchedulerUI
        state={backupSchedulerState}
        onStateChange={handleBackupSchedulerChange}
      />

      {/* Backup History */}
      <BackupHistoryUI
        backups={backupSchedulerState.backupHistory}
        onDelete={handleDeleteBackup}
        onRestore={handleRestoreBackup}
      />

      {/* Field Selection */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Export-Felder auswählen</CardTitle>
              <CardDescription>
                Wähle aus, welche Informationen exportiert werden sollen
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Alle
              </Button>
              <Button variant="ghost" size="sm" onClick={selectNone}>
                Keine
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {exportFields.map((field) => (
              <div key={field.id} className="flex items-center space-x-2">
                <Checkbox
                  id={field.id}
                  checked={selectedFields.includes(field.id)}
                  onCheckedChange={() => toggleField(field.id)}
                />
                <Label
                  htmlFor={field.id}
                  className="text-sm cursor-pointer text-foreground"
                >
                  {field.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card
          className="bg-gradient-card border-border/50 cursor-pointer hover:shadow-vinyl transition-shadow"
          onClick={exportToExcel}
        >
          <CardContent className="p-6 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-green-600" />
            <h3 className="text-lg font-semibold mb-1">Excel (.xlsx)</h3>
            <p className="text-sm text-muted-foreground">
              Öffnen mit Excel, Numbers, Google Sheets
            </p>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-card border-border/50 cursor-pointer hover:shadow-vinyl transition-shadow"
          onClick={exportToCSV}
        >
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-blue-600" />
            <h3 className="text-lg font-semibold mb-1">CSV</h3>
            <p className="text-sm text-muted-foreground">
              Universelles Format für andere Tools
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Selected fields count */}
      <div className="text-center text-sm text-muted-foreground">
        <Check className="w-4 h-4 inline mr-1" />
        {selectedFields.length} von {exportFields.length} Feldern ausgewählt
      </div>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Sicherung importieren
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Die Sicherung enthält <strong>{pendingImport?.length || 0} Tonträger</strong>.
              </p>
              <div className="space-y-2">
                <Label className="text-foreground">Import-Modus:</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === "merge"}
                      onChange={() => setImportMode("merge")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Zusammenführen (hinzufügen)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Ersetzen (überschreiben)</span>
                  </label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>
              Importieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
