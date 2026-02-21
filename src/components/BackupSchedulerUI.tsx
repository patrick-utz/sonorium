import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  BackupFrequency,
  BackupSchedulerState,
  formatBackupDate,
  getTimeUntilNextBackup,
  saveBackupSchedulerState,
} from "@/lib/backupScheduler";
import { Clock, AlertCircle } from "lucide-react";

interface BackupSchedulerUIProps {
  state: BackupSchedulerState;
  onStateChange: (state: BackupSchedulerState) => void;
}

export function BackupSchedulerUI({
  state,
  onStateChange,
}: BackupSchedulerUIProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleEnabled = (enabled: boolean) => {
    const newState = { ...state, enabled };
    if (enabled && !state.lastBackupDate) {
      toast({
        title: "Auto-Backup aktiviert",
        description: `Auto-Backup ist jetzt aktiv. Nächste Sicherung: ${state.frequency}`,
      });
    } else if (!enabled) {
      toast({
        title: "Auto-Backup deaktiviert",
        description: "Du kannst jederzeit manuell eine Sicherung erstellen.",
      });
    }
    onStateChange(newState);
  };

  const handleFrequencyChange = (frequency: BackupFrequency) => {
    const newState = { ...state, frequency };
    onStateChange(newState);
    toast({
      title: "Sicherungshäufigkeit aktualisiert",
      description: `Sicherungen werden jetzt ${frequency === 'daily' ? 'täglich' : frequency === 'weekly' ? 'wöchentlich' : 'monatlich'} erstellt.`,
    });
  };

  const frequencyLabels = {
    daily: "Täglich",
    weekly: "Wöchentlich",
    monthly: "Monatlich",
    manual: "Manuell",
  };

  const frequencyDescriptions = {
    daily: "Eine Sicherung pro Tag",
    weekly: "Eine Sicherung pro Woche",
    monthly: "Eine Sicherung pro Monat",
    manual: "Nur manuelle Sicherungen",
  };

  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Auto-Sicherung</CardTitle>
        <CardDescription>
          Automatische Sicherungen deiner Sammlung einplanen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
          <div>
            <Label className="text-base font-medium">Auto-Sicherung</Label>
            <p className="text-xs text-muted-foreground mt-1">
              {state.enabled
                ? "Sicherungen werden automatisch erstellt"
                : "Auto-Sicherung ist deaktiviert"}
            </p>
          </div>
          <Switch
            checked={state.enabled}
            onCheckedChange={handleToggleEnabled}
          />
        </div>

        {/* Frequency Selection */}
        {state.enabled && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Sicherungshäufigkeit</Label>
            <Select
              value={state.frequency}
              onValueChange={(value) =>
                handleFrequencyChange(value as BackupFrequency)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">
                  {frequencyLabels.daily}
                </SelectItem>
                <SelectItem value="weekly">
                  {frequencyLabels.weekly}
                </SelectItem>
                <SelectItem value="monthly">
                  {frequencyLabels.monthly}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {frequencyDescriptions[state.frequency]}
            </p>
          </div>
        )}

        {/* Status Information */}
        {state.enabled && state.lastBackupDate && (
          <div className="p-3 bg-background/50 rounded-lg border border-border/30 space-y-2">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Letzte Sicherung</p>
                <p className="text-xs text-muted-foreground">
                  {formatBackupDate(state.lastBackupDate)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Nächste Sicherung</p>
                <p className="text-xs text-muted-foreground">
                  {getTimeUntilNextBackup(state.frequency, state.lastBackupDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {state.enabled && !state.lastBackupDate && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              Auto-Sicherung ist aktiviert. Die erste Sicherung wird beim nächsten
              Besuch erstellt.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="p-3 bg-background/50 rounded-lg border border-border/30 text-xs text-muted-foreground space-y-1">
          <p>
            💾 Sicherungen werden lokal im Browser-Speicher verwaltet und können
            jederzeit manuell heruntergeladen werden.
          </p>
          <p>
            🔄 Aktive Sicherungen: {state.backupHistory.length} /{" "}
            {state.maxBackups}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
