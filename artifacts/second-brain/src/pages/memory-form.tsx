import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateMemory,
  useGetMemory,
  useUpdateMemory,
  getListMemoriesQueryKey,
  getGetMemoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["thought", "note", "learning", "idea", "journal", "task"]),
  category: z.enum(["work", "personal", "learning", "ideas", "health", "business"]),
  tags: z.string(),
  isPinned: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export default function MemoryForm() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!params.id;
  const memoryId = params.id ? parseInt(params.id) : undefined;

  const { data: existing, isLoading } = useGetMemory(memoryId!, {
    query: {
      enabled: !!memoryId,
      queryKey: getGetMemoryQueryKey(memoryId!),
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "note",
      category: "personal",
      tags: "",
      isPinned: false,
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        title: existing.title,
        content: existing.content,
        type: existing.type as any,
        category: existing.category as any,
        tags: (existing.tags ?? []).join(", "),
        isPinned: existing.isPinned ?? false,
      });
    }
  }, [existing, form]);

  const createMemory = useCreateMemory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
        toast({ title: "Memory created" });
        setLocation("/memories");
      },
      onError: () => toast({ title: "Failed to create memory", variant: "destructive" }),
    },
  });

  const updateMemory = useUpdateMemory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
        if (memoryId) queryClient.invalidateQueries({ queryKey: getGetMemoryQueryKey(memoryId) });
        toast({ title: "Memory updated" });
        setLocation("/memories");
      },
      onError: () => toast({ title: "Failed to update memory", variant: "destructive" }),
    },
  });

  function onSubmit(values: FormValues) {
    const tags = values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = { ...values, tags };
    if (isEditing && memoryId) {
      updateMemory.mutate({ id: memoryId, data: payload });
    } else {
      createMemory.mutate({ data: payload });
    }
  }

  const isPending = createMemory.isPending || updateMemory.isPending;

  return (
    <ProtectedLayout>
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/memories")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEditing ? "Edit Memory" : "New Memory"}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isEditing ? "Update your stored memory" : "Capture something worth remembering"}
            </p>
          </div>
        </div>

        {isEditing && isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full bg-secondary" />
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Memory Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Give this memory a title..."
                            className="bg-secondary border-border"
                            data-testid="input-memory-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="What do you want to remember?"
                            className="bg-secondary border-border min-h-[140px] resize-none"
                            data-testid="textarea-memory-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="bg-secondary border-border" data-testid="select-memory-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["thought", "note", "learning", "idea", "journal", "task"].map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t.charAt(0).toUpperCase() + t.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="bg-secondary border-border" data-testid="select-memory-category">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["work", "personal", "learning", "ideas", "health", "business"].map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c.charAt(0).toUpperCase() + c.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="tag1, tag2, tag3 (comma-separated)"
                            className="bg-secondary border-border"
                            data-testid="input-memory-tags"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPinned"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div>
                          <FormLabel className="text-sm font-medium">Pin memory</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Pinned memories appear at the top
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-memory-pinned"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/memories")}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="flex-1"
                      data-testid="button-save-memory"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Memory"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  );
}
