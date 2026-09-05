import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { MoreHorizontal, Pencil, UserCheck, Share2, Trash2, Eye } from "lucide-react";
import { canDeleteEvent, getDeleteBlockedReason, getEventId } from "./eventConstants";

/**
 * Single shared row-action control for desktop + mobile.
 * Primary Edit stays visible; everything else lives in an overflow menu
 * so mobile cards stay light (44px targets) with zero logic duplication.
 */
export default function EventRowActions({
  event,
  onEdit,
  onManageJudges,
  onShare,
  onViewRegistrations,
  onStatusChange,
  onDelay,
  onResume,
  onDelete,
  align = "end",
  canManageJudges = true,
  canDelete = true,
  canDelayResume = true,
}) {
  const id = getEventId(event);
  const s = event?.status || "draft";
  const deletable = canDelete && canDeleteEvent(event);
  const deleteReason = !canDelete
    ? "Only organizers can delete events"
    : getDeleteBlockedReason(event?.status);

  // Coordinators may open/close registration (PATCH /status) but never
  // delay/resume (organizer-only routes) — hide those menu items for them.
  const statusLabel =
    s === "draft"
      ? "Open registration"
      : s === "registration_open"
        ? "Close registration"
        : s === "delayed"
          ? canDelayResume ? "Resume event" : null
          : s !== "cancelled"
            ? canDelayResume ? "Delay event" : null
            : null;

  const handleStatusAction = () => {
    if (s === "draft") onStatusChange?.(id, "registration_open");
    else if (s === "registration_open") onStatusChange?.(id, "registration_closed");
    else if (s === "delayed") onResume?.(id);
    else if (s !== "cancelled") onDelay?.(id);
  };

  const showOverflow =
    (canManageJudges && onManageJudges) ||
    onShare ||
    onViewRegistrations ||
    statusLabel ||
    (canDelete && onDelete);

  // Edit (PUT /event/:id) is allowed for coordinators on assigned events only.
  // Keep the button — backend enforces ownership — but gate the overflow menu.
  if (!showOverflow) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit?.(event)}
          className="min-h-[36px]"
        >
          <Pencil className="h-3.5 w-3.5 md:mr-1" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit?.(event)}
        className="min-h-[36px]"
      >
        <Pencil className="h-3.5 w-3.5 md:mr-1" />
        <span className="hidden sm:inline">Edit</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label={`More actions for ${event?.title || event?.name || "event"}`}
            className="min-h-[36px] min-w-[36px] px-2"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-52">
          <DropdownMenuLabel>Event actions</DropdownMenuLabel>
          {canManageJudges && (
            <DropdownMenuItem
              onSelect={() => onManageJudges?.(event)}
              className="min-h-[44px] cursor-pointer"
            >
              <UserCheck className="mr-2 h-4 w-4 text-accent-amber" />
              Manage judges
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => onShare?.(event)}
            className="min-h-[44px] cursor-pointer"
          >
            <Share2 className="mr-2 h-4 w-4 text-accent-amber" />
            Share invite
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onViewRegistrations?.(event)}
            className="min-h-[44px] cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4 text-accent-amber" />
            View registrations
          </DropdownMenuItem>
          {statusLabel && (
            <DropdownMenuItem
              onSelect={handleStatusAction}
              className="min-h-[44px] cursor-pointer"
            >
              {statusLabel}
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!deletable}
                title={deleteReason || undefined}
                onSelect={() => deletable && onDelete?.(id)}
                className="min-h-[44px] cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete{!deletable ? " (blocked)" : ""}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
