import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { MoreHorizontal, Pencil, UserCheck, Share2, Trash2 } from "lucide-react";
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
  onStatusChange,
  onDelay,
  onResume,
  onDelete,
  align = "end",
}) {
  const id = getEventId(event);
  const s = event?.status || "draft";
  const deletable = canDeleteEvent(event);
  const deleteReason = getDeleteBlockedReason(event?.status);

  const statusLabel =
    s === "draft"
      ? "Open registration"
      : s === "registration_open"
        ? "Close registration"
        : s === "delayed"
          ? "Resume event"
          : s !== "cancelled"
            ? "Delay event"
            : null;

  const handleStatusAction = () => {
    if (s === "draft") onStatusChange?.(id, "registration_open");
    else if (s === "registration_open") onStatusChange?.(id, "registration_closed");
    else if (s === "delayed") onResume?.(id);
    else if (s !== "cancelled") onDelay?.(id);
  };

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
          <DropdownMenuItem
            onSelect={() => onManageJudges?.(event)}
            className="min-h-[44px] cursor-pointer"
          >
            <UserCheck className="mr-2 h-4 w-4 text-accent-amber" />
            Manage judges
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onShare?.(event)}
            className="min-h-[44px] cursor-pointer"
          >
            <Share2 className="mr-2 h-4 w-4 text-accent-amber" />
            Share invite
          </DropdownMenuItem>
          {statusLabel && (
            <DropdownMenuItem
              onSelect={handleStatusAction}
              className="min-h-[44px] cursor-pointer"
            >
              {statusLabel}
            </DropdownMenuItem>
          )}
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
