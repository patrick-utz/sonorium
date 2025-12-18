import { useState } from "react";
import { useRecords } from "@/context/RecordContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, FileText, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

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
  { id: "purchasePrice", label: "Kaufpreis", default: false },
  { id: "purchaseLocation", label: "Kaufort", default: false },
  { id: "vinylRecommendation", label: "Vinyl-Empfehlung", default: false },
  { id: "personalNotes", label: "Notizen", default: false },
];

export default function Export() {
  const { records } = useRecords();
  const { toast } = useToast();

  const [selectedFields, setSelectedFields] = useState<string[]>(
    exportFields.filter((f) => f.default).map((f) => f.id)
  );

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
      const row: Record<string, any> = {};
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
    const labels: Record<string, string> = {};
    exportFields.forEach((f) => {
      labels[f.id] = f.label;
    });
    return labels;
  };

  const exportToExcel = () => {
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

    // Transform data to use German labels as headers
    const transformedData = data.map((row) => {
      const newRow: Record<string, any> = {};
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

    XLSX.writeFile(wb, `VinylVault_Export_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Export erfolgreich",
      description: `${records.length} Tonträger wurden exportiert.`,
    });
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
    link.download = `VinylVault_Export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export erfolgreich",
      description: `${records.length} Tonträger wurden exportiert.`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold gradient-text flex items-center gap-3">
          <Download className="w-8 h-8 text-primary" />
          Export
        </h1>
        <p className="text-muted-foreground mt-1">
          Exportiere deine Sammlung als Excel oder CSV-Datei
        </p>
      </div>

      {/* Stats */}
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-4xl font-display font-bold text-foreground">
              {records.length}
            </p>
            <p className="text-muted-foreground">Tonträger zum Exportieren</p>
          </div>
        </CardContent>
      </Card>

      {/* Field Selection */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">Felder auswählen</CardTitle>
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
            <h3 className="font-display text-lg font-semibold mb-1">Excel (.xlsx)</h3>
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
            <h3 className="font-display text-lg font-semibold mb-1">CSV</h3>
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
    </motion.div>
  );
}
