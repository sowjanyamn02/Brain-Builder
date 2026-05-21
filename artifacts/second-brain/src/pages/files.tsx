import { useState, useRef } from "react";
import {
  useListFiles,
  useDeleteFile,
  getListFilesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Upload, FolderOpen, Trash2, FileText, File } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-rose-400" />;
  if (mimeType === "text/plain") return <File className="h-5 w-5 text-blue-400" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function fileTypeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "text/plain") return "TXT";
  if (mimeType.includes("wordprocessingml")) return "DOCX";
  return "FILE";
}

export default function FilesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: files, isLoading } = useListFiles();
  const deleteFile = useDeleteFile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
        toast({ title: "File deleted" });
        setDeleteId(null);
      },
      onError: () => toast({ title: "Failed to delete file", variant: "destructive" }),
    },
  });

  async function uploadFile(file: File) {
    const allowed = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Only PDF, TXT, and DOCX files are supported", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File must be smaller than 10 MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE}/api/files`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
      toast({ title: `${file.name} uploaded and indexed` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  return (
    <ProtectedLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Files</h1>
          <p className="text-muted-foreground mt-1">
            Upload documents to index them into your memory bank
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/10"
              : uploading
              ? "border-primary/50 bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-secondary/30"
          }`}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          data-testid="drop-zone-files"
        >
          <Upload className={`h-8 w-8 ${uploading ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
          <div className="text-center">
            <p className="font-medium text-foreground">
              {uploading ? "Uploading..." : "Drop a file here or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF, TXT, DOCX up to 10 MB
            </p>
          </div>
          {!uploading && (
            <Button variant="outline" size="sm" data-testid="button-browse-files">
              Browse files
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.docx"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-file-upload"
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Uploaded files ({files?.length ?? 0})
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-secondary" />
              ))}
            </div>
          ) : files && files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file) => (
                <Card
                  key={file.id}
                  data-testid={`card-file-${file.id}`}
                  className="bg-card border-border"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-secondary p-2.5 rounded-lg flex-shrink-0">
                      {fileIcon(file.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {file.originalName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-xs">
                          {fileTypeLabel(file.mimeType)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(file.size)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => setDeleteId(file.id)}
                      data-testid={`button-delete-file-${file.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
              <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-foreground font-medium mb-1">No files uploaded yet</p>
              <p className="text-sm text-muted-foreground">
                Uploaded files are automatically converted to searchable memories.
              </p>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the file. The memory created from it will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteFile.mutate({ id: deleteId })}
              data-testid="button-confirm-delete-file"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedLayout>
  );
}
