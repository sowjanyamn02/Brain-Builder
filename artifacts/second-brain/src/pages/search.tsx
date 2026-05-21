import { useState } from "react";
import { useLocation } from "wouter";
import { useSearchMemories } from "@workspace/api-client-react";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon, Sparkles, ArrowRight } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  thought: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  note: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  learning: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  idea: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  journal: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  task: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const searchMemories = useSearchMemories();

  function handleSearch() {
    if (!query.trim()) return;
    setSubmittedQuery(query.trim());
    searchMemories.mutate({ data: { query: query.trim(), limit: 10 } });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  const results = searchMemories.data?.results ?? [];
  const hasSearched = submittedQuery !== "";

  return (
    <ProtectedLayout>
      <div className="p-8 max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Semantic Search
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered search across all your memories
          </p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What are you looking for?"
              className="pl-9 bg-secondary border-border h-12 text-base"
              data-testid="input-search-query"
              autoFocus
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || searchMemories.isPending}
            className="h-12 px-6"
            data-testid="button-search"
          >
            {searchMemories.isPending ? (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Searching...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Search
              </span>
            )}
          </Button>
        </div>

        {hasSearched && !searchMemories.isPending && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {results.length > 0
                ? `Found ${results.length} relevant memories for "${submittedQuery}"`
                : `No memories found for "${submittedQuery}"`}
            </p>

            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map(({ memory, score }, i) => (
                  <Card
                    key={memory.id}
                    data-testid={`card-result-${memory.id}`}
                    className="bg-card border-border hover:border-primary/40 transition-colors cursor-pointer group"
                    onClick={() => setLocation(`/memories/${memory.id}/edit`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                            <span className="text-xs text-muted-foreground ml-auto">
                              {Math.round(score * 100)}% match
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground">{memory.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
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
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <SearchIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-foreground font-medium mb-1">No results found</p>
                <p className="text-muted-foreground text-sm">
                  Try different keywords or add more memories to your brain.
                </p>
              </div>
            )}
          </div>
        )}

        {!hasSearched && (
          <div className="text-center py-16 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-base font-medium text-foreground mb-1">AI-powered semantic search</p>
            <p className="text-sm">
              Search by concept, not just keywords. The AI understands what you mean.
            </p>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
