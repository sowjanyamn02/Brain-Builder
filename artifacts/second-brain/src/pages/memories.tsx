import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListMemories,
  useDeleteMemory,
  getListMemoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, MoreVertical, Pencil, Trash2, Pin, Brain } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  thought: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  note: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  learning: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  idea: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  journal: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  task: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const MEMORY_TYPES = ["all", "thought", "note", "learning", "idea", "journal", "task"];
const CATEGORIES = ["all", "work", "personal", "learning", "ideas", "health", "business"];

export default function Memories() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const params = {
    ...(typeFilter !== "all" ? { type: typeFilter } : {}),
    ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
    ...(search ? { q: search } : {}),
  };

  const { data: memories, isLoading } = useListMemories(params);
  const deleteMemory = useDeleteMemory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
        toast({ title: "Memory deleted" });
        setDeleteId(null);
      },
    },
  });

  return (
    <ProtectedLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Memories</h1>
            <p className="text-muted-foreground mt-1">
              {memories?.length ?? 0} memories stored
            </p>
          </div>
          <Link href="/memories/new">
            <Button data-testid="button-new-memory">
              <Plus className="mr-2 h-4 w-4" />
              New Memory
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search-memories"
              placeholder="Search memories..."
              className="pl-9 bg-secondary border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] bg-secondary border-border" data-testid="select-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {MEMORY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px] bg-secondary border-border" data-testid="select-category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "all" ? "All categories" : c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full bg-secondary" />
            ))}
          </div>
        ) : memories && memories.length > 0 ? (
          <div className="space-y-3">
            {memories.map((memory) => (
              <Card
                key={memory.id}
                data-testid={`card-memory-${memory.id}`}
                className="bg-card border-border hover:border-primary/40 transition-colors group"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {memory.isPinned && (
                          <Pin className="h-3.5 w-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                        )}
                        <span
                          className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${
                            TYPE_COLORS[memory.type] ?? "bg-muted text-muted-foreground border-muted"
                          }`}
                        >
                          {memory.type}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {memory.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground truncate">{memory.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {memory.content}
                      </p>
                      {memory.tags && memory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {memory.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs bg-secondary text-muted-foreground"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(memory.updatedAt).toLocaleDateString()}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-memory-menu-${memory.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/memories/${memory.id}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(memory.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Brain className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No memories yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Start building your second brain by adding your first memory.
            </p>
            <Link href="/memories/new">
              <Button data-testid="button-add-first-memory">
                <Plus className="mr-2 h-4 w-4" />
                Add your first memory
              </Button>
            </Link>
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This memory will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMemory.mutate({ id: deleteId })}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedLayout>
  );
}
