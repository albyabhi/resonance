import { Download, Link2, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";

export default function ParticipantToolbar({
  searchInput,
  onSearchChange,
  filterGroup,
  onGroupChange,
  filterStatus,
  onStatusChange,
  filterClass,
  onClassChange,
  groups,
  groupsLoading,
  groupLabel,
  total,
  isRefetching,
  selectedCount,
  onSelectPage,
  onClearSelection,
  canSelectPage,
  isSuperAdmin,
  onAdd,
  onImport,
  onExport,
  onBulkLinks,
  onBulkDelete,
  linksLoading,
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <Label htmlFor="participant-search" className="sr-only">Search participants</Label>
            <Input
              id="participant-search"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, email, ID…"
              className="min-h-11"
            />
          </div>
          <div className="sm:w-52">
            <Label htmlFor="participant-group" className="sr-only">Filter by group</Label>
            <Select value={filterGroup} onValueChange={onGroupChange}>
              <SelectTrigger id="participant-group" className="min-h-11">
                <SelectValue placeholder={groupsLoading ? "Loading…" : `All ${groupLabel}s`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All {groupLabel}s</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group._id} value={group._id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <div className="w-36">
              <Label htmlFor="participant-status" className="sr-only">Filter by status</Label>
              <Select value={filterStatus} onValueChange={onStatusChange}>
                <SelectTrigger id="participant-status" className="min-h-11">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  <SelectItem value="disqualified">Disqualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Label htmlFor="participant-class" className="sr-only">Filter by class</Label>
              <Input
                id="participant-class"
                value={filterClass}
                onChange={(e) => onClassChange(e.target.value)}
                placeholder="Class"
                className="min-h-11"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAdd} className="min-h-10 bg-accent-amber text-white hover:bg-accent-amber/90">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
          {isSuperAdmin && (
            <Button variant="outline" className="min-h-10" onClick={onImport}>
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
          )}
          <Button variant="outline" className="min-h-10" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
        <span>{isRefetching ? "Updating…" : `${total} participant${total === 1 ? "" : "s"}`}</span>
        {selectedCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-card-foreground">
            {selectedCount} selected
            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </span>
        ) : (
          canSelectPage && (
            <button type="button" onClick={onSelectPage} className="underline underline-offset-2 hover:text-foreground">
              Select this page
            </button>
          )
        )}
        {selectedCount > 0 && (
          <span className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-9"
              disabled={linksLoading}
              onClick={onBulkLinks}
              title="Generate copyable setup links for selected participants (rotates old links, 7-day expiry)"
            >
              <Link2 className="h-3.5 w-3.5 mr-1" /> Links ({selectedCount})
            </Button>
            <Button variant="destructive" size="sm" className="min-h-9" onClick={onBulkDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete ({selectedCount})
            </Button>
          </span>
        )}
      </div>
    </div>
  );
}
