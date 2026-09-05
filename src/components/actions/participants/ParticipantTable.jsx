import { AlertTriangle, ChevronLeft, ChevronRight, KeyRound, Link2, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Checkbox } from "../../ui/checkbox";
import { Skeleton } from "../../ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "../../ui/dropdown-menu";
import { getCredentialMeta, getParticipantStatusMeta } from "./participantUi";

function RowMenu({ onEdit, onStatus, onLink, onDelete, linksLoading }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={onStatus}><AlertTriangle className="h-3.5 w-3.5 mr-2" /> Change status</DropdownMenuItem>
        <DropdownMenuItem onClick={onLink} disabled={linksLoading}><Link2 className="h-3.5 w-3.5 mr-2" /> Copy setup link</DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableSkeleton({ groupLabel }) {
  return (
    <Card className="hidden sm:block overflow-hidden">
      <div className="p-3 space-y-2" aria-label="Loading participants" role="status">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
        <span className="sr-only">Loading participants… ({groupLabel})</span>
      </div>
    </Card>
  );
}

export default function ParticipantTable({
  participants,
  selectedIds,
  onToggleSelect,
  onEdit,
  onStatus,
  onLink,
  onDelete,
  getGroupName,
  groupLabel,
  isInitialLoading,
  isRefetching,
  linksLoading,
  page,
  limit,
  total,
  onPageChange,
  onClearFilters,
  onAdd,
}) {
  if (isInitialLoading) {
    return (
      <div className="space-y-2">
        <TableSkeleton groupLabel={groupLabel} />
        <ul className="space-y-2 sm:hidden" aria-label="Loading participants">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="rounded-xl border border-border p-3 bg-card">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!participants.length) {
    return (
      <Card className="p-8 text-center">
        <Users className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-card-foreground">No participants found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try clearing filters, or add the first participant. Participants can also self-serve via Participant Login → Claim.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={onClearFilters}>Clear filters</Button>
          <Button onClick={onAdd} className="bg-accent-amber text-white hover:bg-accent-amber/90">Add participant</Button>
        </div>
      </Card>
    );
  }

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className={`space-y-2 ${isRefetching ? "opacity-70 pointer-events-none" : ""}`} aria-busy={isRefetching}>
      <ul className="space-y-2 sm:hidden" aria-label="Participants list">
        {participants.map((stu) => (
          <li key={stu._id} className="rounded-xl border border-border p-3 shadow-sm bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium break-words text-card-foreground">
                  {stu.name}
                  <Badge variant={getParticipantStatusMeta(stu.status).badge} className="ml-2 text-[10px]">
                    {getParticipantStatusMeta(stu.status).label}
                  </Badge>
                </p>
                <p className="mt-1">
                  <Badge variant={getCredentialMeta(stu).badge} className="text-[10px]" title={getCredentialMeta(stu).hint}>
                    <KeyRound className="h-3 w-3 mr-1" />{getCredentialMeta(stu).label}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">Class: <span className="font-medium text-card-foreground">{stu.class}</span></p>
                <p className="text-xs text-muted-foreground">{groupLabel}: <span className="font-medium text-card-foreground">{getGroupName(stu.group_id?._id || stu.group_id)}</span></p>
                <p className="text-[11px] mt-1 text-muted-foreground">ID: {stu.unique_id}</p>
              </div>
              <Checkbox
                aria-label={`Select ${stu.name}`}
                checked={selectedIds.includes(stu._id)}
                onCheckedChange={() => onToggleSelect(stu._id)}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(stu)}>Edit</Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onLink(stu)} disabled={linksLoading}>Link</Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onStatus(stu)}>Status</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={() => onDelete(stu)}>Delete</Button>
            </div>
          </li>
        ))}
      </ul>

      <Card className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead title="Password set = Active. Otherwise share a setup link or ask them to Claim.">Access</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>{groupLabel}</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((stu) => (
              <TableRow key={stu._id}>
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${stu.name}`}
                    checked={selectedIds.includes(stu._id)}
                    onCheckedChange={() => onToggleSelect(stu._id)}
                  />
                </TableCell>
                <TableCell className="text-card-foreground">
                  <span className="font-medium">{stu.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{stu.unique_id}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={getParticipantStatusMeta(stu.status).badge}>
                    {getParticipantStatusMeta(stu.status).label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getCredentialMeta(stu).badge} title={getCredentialMeta(stu).hint}>
                    {getCredentialMeta(stu).label}
                  </Badge>
                </TableCell>
                <TableCell className="text-card-foreground">{stu.class}</TableCell>
                <TableCell className="text-card-foreground">{getGroupName(stu.group_id?._id || stu.group_id)}</TableCell>
                <TableCell>
                  <RowMenu
                    onEdit={() => onEdit(stu)}
                    onStatus={() => onStatus(stu)}
                    onLink={() => onLink(stu)}
                    onDelete={() => onDelete(stu)}
                    linksLoading={linksLoading}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
        <span aria-live="polite">Showing {start}–{end} of {total}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="min-h-9" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <span aria-live="polite">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" className="min-h-9" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
