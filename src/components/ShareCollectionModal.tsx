import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  generateShareToken,
  generateShareURL,
  filterRecordsForSharing,
  storeShareMetadata,
  ShareOptions,
} from "@/lib/sharingUtils";
import { Record } from "@/types/record";
import { Share2, Copy, Check, Mail, Users } from "lucide-react";

interface ShareCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: Record[];
}

export function ShareCollectionModal({
  open,
  onOpenChange,
  records,
}: ShareCollectionModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  // Share options state
  const [includeWishlist, setIncludeWishlist] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [expiryDays, setExpiryDays] = useState<"7" | "30" | "90" | "never">(
    "30"
  );
  const [recipientEmail, setRecipientEmail] = useState("");

  const shareOptions: ShareOptions = {
    includeWishlist,
    onlyFavorites,
  };

  const filteredRecords = filterRecordsForSharing(records, shareOptions);

  const handleGenerateLink = () => {
    const token = generateShareToken();
    const shareURL = generateShareURL(token);

    // Calculate expiry date
    let expiresAt: string | undefined;
    if (expiryDays !== "never") {
      const days = parseInt(expiryDays);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);
      expiresAt = expiry.toISOString();
    }

    // Store share metadata
    storeShareMetadata({
      token,
      createdAt: new Date().toISOString(),
      expiresAt,
      recordCount: filteredRecords.length,
      options: shareOptions,
      recipientEmail: recipientEmail || undefined,
    });

    setShareLink(shareURL);

    toast({
      title: "Teilungslink erstellt",
      description: `${filteredRecords.length} Tonträger können jetzt geteilt werden.`,
    });
  };

  const handleCopyLink = () => {
    if (!shareLink) return;

    navigator.clipboard.writeText(shareLink);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);

    toast({
      title: "Link kopiert",
      description: "Der Teilungslink wurde in die Zwischenablage kopiert.",
    });
  };

  const handleSendEmail = () => {
    if (!shareLink || !recipientEmail) return;

    // Create mailto link
    const subject = encodeURIComponent("Meine SONORIUM Musiksammlung");
    const body = encodeURIComponent(
      `Hallo,\n\nSchau dir meine Musiksammlung an:\n\n${shareLink}\n\n` +
        `Sie enthält ${filteredRecords.length} Tonträger.\n\nViel Spaß beim Erkunden!\n\nViele Grüße`
    );

    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Sammlung teilen
          </DialogTitle>
          <DialogDescription>
            Teile deine Musiksammlung mit Freunden über einen einzigartigen Link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Was möchtest du teilen?</h3>

            <div className="space-y-3">
              <div className="flex items-center space-x-2 p-3 bg-background/50 rounded-lg border border-border/30">
                <Checkbox
                  id="only-owned"
                  checked={!includeWishlist}
                  onCheckedChange={(checked) =>
                    setIncludeWishlist(!checked)
                  }
                />
                <Label
                  htmlFor="only-owned"
                  className="flex-1 cursor-pointer text-sm"
                >
                  <span className="font-medium">Nur in Sammlung</span>
                  <p className="text-xs text-muted-foreground">
                    {!includeWishlist
                      ? "Nur deine Tonträger"
                      : "Deine Tonträger + Wunschliste"}
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-background/50 rounded-lg border border-border/30">
                <Checkbox
                  id="favorites-only"
                  checked={onlyFavorites}
                  onCheckedChange={setOnlyFavorites}
                />
                <Label
                  htmlFor="favorites-only"
                  className="flex-1 cursor-pointer text-sm"
                >
                  <span className="font-medium">Nur Favoriten</span>
                  <p className="text-xs text-muted-foreground">
                    {onlyFavorites
                      ? "Nur deine Lieblingseintragungen"
                      : "Alle Einträge"}
                  </p>
                </Label>
              </div>
            </div>

            <div className="text-sm text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              📊 {filteredRecords.length} Tonträger werden geteilt
            </div>
          </div>

          {/* Expiry Settings */}
          <div className="space-y-2">
            <Label htmlFor="expiry" className="text-sm font-semibold">
              Link-Ablauf
            </Label>
            <Select value={expiryDays} onValueChange={(value: any) => setExpiryDays(value)}>
              <SelectTrigger id="expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Tage</SelectItem>
                <SelectItem value="30">30 Tage</SelectItem>
                <SelectItem value="90">90 Tage</SelectItem>
                <SelectItem value="never">Nie ablaufen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Share Link Display */}
          {shareLink ? (
            <div className="space-y-3 p-4 bg-background/50 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-900 dark:text-green-200">
                ✓ Teilungslink erstellt
              </p>

              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Kopiert
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Kopieren
                    </>
                  )}
                </Button>
              </div>

              {/* Email Option */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">
                  Per E-Mail senden
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="freund@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={handleSendEmail}
                    disabled={!recipientEmail}
                    className="gap-1"
                  >
                    <Mail className="w-4 h-4" />
                    Senden
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleGenerateLink}
              size="lg"
              className="w-full gap-2"
            >
              <Share2 className="w-4 h-4" />
              Teilungslink erstellen
            </Button>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>🔒 Nur mit dem Link Zugriff möglich</p>
            <p>🎵 Freunde können deine Sammlung durchsuchen und nach Genres filtern</p>
            <p>⏱️ Der Link läuft ab nach {expiryDays === "never" ? "nie" : `${expiryDays} Tagen`}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
