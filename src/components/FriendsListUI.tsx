import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  UserCheck,
  Trash2,
  MessageSquare,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Friend {
  id: string;
  name: string;
  email: string;
  status: "friend" | "pending" | "blocked";
  mutualRecords?: number;
  avatar?: string;
}

interface FriendsListUIProps {
  friends: Friend[];
  onAddFriend: (email: string) => void;
  onRemoveFriend: (friendId: string) => void;
  onAcceptRequest: (friendId: string) => void;
  onRejectRequest: (friendId: string) => void;
}

export function FriendsListUI({
  friends,
  onAddFriend,
  onRemoveFriend,
  onAcceptRequest,
  onRejectRequest,
}: FriendsListUIProps) {
  const { toast } = useToast();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  const confirmedFriends = friends.filter((f) => f.status === "friend");
  const pendingRequests = friends.filter((f) => f.status === "pending");

  const handleAddFriend = () => {
    if (!newFriendEmail || !newFriendEmail.includes("@")) {
      toast({
        title: "Ungültige E-Mail",
        description: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
        variant: "destructive",
      });
      return;
    }

    onAddFriend(newFriendEmail);
    setNewFriendEmail("");
    setShowAddFriend(false);

    toast({
      title: "Freundschaftsanfrage gesendet",
      description: `Anfrage an ${newFriendEmail} wurde gesendet.`,
    });
  };

  const handleRemove = (friendId: string) => {
    onRemoveFriend(friendId);
    setRemoveConfirm(null);
    toast({
      title: "Freund entfernt",
      description: "Der Freund wurde aus deiner Liste entfernt.",
    });
  };

  if (confirmedFriends.length === 0 && pendingRequests.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="font-semibold">Noch keine Freunde</p>
              <p className="text-sm text-muted-foreground">
                Füge Freunde hinzu, um Sammlungen zu vergleichen und
                Empfehlungen zu erhalten.
              </p>
            </div>
            <Button onClick={() => setShowAddFriend(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Ersten Freund hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirmed Friends */}
      {confirmedFriends.length > 0 && (
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Freunde</CardTitle>
                <CardDescription>
                  {confirmedFriends.length} Freund
                  {confirmedFriends.length !== 1 ? "e" : ""}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddFriend(true)}
                className="gap-1"
              >
                <UserPlus className="w-4 h-4" />
                Hinzufügen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {confirmedFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30 hover:border-border/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-semibold">
                          {friend.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{friend.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {friend.email}
                      </p>
                      {friend.mutualRecords !== undefined && (
                        <p className="text-xs text-accent mt-1">
                          {friend.mutualRecords} gemeinsame Tonträger
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Sammlungen vergleichen"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setRemoveConfirm(friend.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Entfernen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="bg-gradient-card border-border/50 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Offene Anfragen</CardTitle>
            <CardDescription>
              {pendingRequests.length} ausstehende Freundschaftsanfrage
              {pendingRequests.length !== 1 ? "n" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">
                        {request.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{request.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {request.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      size="sm"
                      onClick={() => onAcceptRequest(request.id)}
                      className="gap-1"
                    >
                      <UserCheck className="w-4 h-4" />
                      Akzeptieren
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRejectRequest(request.id)}
                    >
                      Ablehnen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Friend Dialog */}
      {showAddFriend && (
        <Card className="bg-gradient-card border-border/50 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Freund hinzufügen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="friend-email">E-Mail-Adresse</Label>
              <Input
                id="friend-email"
                type="email"
                placeholder="freund@example.com"
                value={newFriendEmail}
                onChange={(e) => setNewFriendEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddFriend();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddFriend} className="flex-1">
                Anfrage senden
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddFriend(false);
                  setNewFriendEmail("");
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={removeConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Freund entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Ihr Freund wird
              aus deiner Liste entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeConfirm) {
                  handleRemove(removeConfirm);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
