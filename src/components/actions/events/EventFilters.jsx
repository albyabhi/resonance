import { useState } from "react";
import { Search, SlidersHorizontal, X, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../../ui/popover";
import { Label } from "../../ui/label";
import { STATUS_OPTIONS } from "../../../utils/eventStatus";
import {
  CATEGORIES,
  MODES,
  EVENT_TYPES,
  DEFAULT_FILTER,
} from "./eventConstants";

export default function EventFilters({
  filter,
  onChange,
  onAdd,
  canAdd,
  resultCount,
  totalCount,
  activeFilterCount = 0,
}) {
  const [open, setOpen] = useState(false);

  const set = (patch) => onChange({ ...filter, ...patch });
  const clearAll = () => onChange({ ...DEFAULT_FILTER, query: filter.query });

  return (
    <div className="rounded-xl border border-border bg-card shadow-soft">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="Search events…"
            aria-label="Search events"
            className="min-h-[44px] pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="relative min-h-[44px] flex-1 md:flex-none"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-1 px-1.5">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[calc(100vw-2rem)] max-w-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Filter events</p>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    Clear all
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs">Category</Label>
                  <Select
                    value={filter.category}
                    onValueChange={(v) => set({ category: v })}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Mode</Label>
                  <Select value={filter.mode} onValueChange={(v) => set({ mode: v })}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="All modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All modes</SelectItem>
                      {MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Type</Label>
                  <Select value={filter.type} onValueChange={(v) => set({ type: v })}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Status</Label>
                  <Select
                    value={filter.status || "all"}
                    onValueChange={(v) => set({ status: v })}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="min-h-[44px] w-full"
                onClick={() => setOpen(false)}
              >
                Show {resultCount} of {totalCount}
              </Button>
            </PopoverContent>
          </Popover>
          {canAdd && (
            <Button
              onClick={onAdd}
              className="hidden min-h-[44px] bg-accent-amber text-white hover:bg-accent-amber/90 md:inline-flex"
            >
              <Plus className="h-4 w-4" />
              New event
            </Button>
          )}
        </div>
      </div>
      {(filter.query || activeFilterCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            {resultCount} of {totalCount} events
          </span>
          {filter.query && (
            <Badge variant="secondary" className="gap-1">
              “{filter.query}”
              <button
                aria-label="Clear search"
                onClick={() => set({ query: "" })}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
