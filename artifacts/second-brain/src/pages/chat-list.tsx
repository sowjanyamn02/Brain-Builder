import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListConversations,
  useCreateConversation,
  useDeleteConversation,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, MessageSquare, MoreVertical, Trash2 } from "lucide-react";

export default function ChatList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: conversations, isLoading } = useListConversations();
  const createConversation = useCreateConversation({
    mutation: {
      onSuccess: (conv) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setCreateOpen(false);
        setNewTitle("");
        setLocation(`/chat/${conv.id}`);
      },
      onError: () => toast({ title: "Failed to start conversation", variant: "destructive" }),
    },
  });
  const deleteConversation = useDeleteConversation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        toast({ title: "Conversation deleted" });
        setDeleteId(null);
      },
    },
  });

  function handleCreate() {
    if (!newTitle.trim()) return;
    createConversation.mutate({ data: { title: newTitle.trim() } });
  }

  return (
    <ProtectedLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">AI Chat</h1>
            <p className="text-muted-foreground mt-1">
              Converse with your memories using AI
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-new-conversation">
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full bg-secondary" />
            ))}
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                data-testid={`card-conversation-${conv.id}`}
                className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer group"
                onClick={() => setLocation(`/chat/${conv.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-primary/20 p-2.5 rounded-full flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(conv.createdAt).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`button-conv-menu-${conv.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(conv.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Start a conversation with your AI memory assistant. It can recall, summarize, and
              help you reflect on everything you've stored.
            </p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-start-first-chat">
              <Plus className="mr-2 h-4 w-4" />
              Start your first chat
            </Button>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>Give this chat a descriptive title.</DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Planning Q3 goals"
            className="bg-secondary border-border"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            data-testid="input-conversation-title"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || createConversation.isPending}
              data-testid="button-create-conversation"
            >
              {createConversation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              All messages in this conversation will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteConversation.mutate({ id: deleteId })}
              data-testid="button-confirm-delete-conv"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedLayout>
  );
}
