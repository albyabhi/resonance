import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { API_ROUTES } from "../../utils/apiClient";
import usePermission from "../../hooks/usePermission";
import { useCompetition } from "../../context/CompetitionContext";
import ImportParticipants from "./ImportParticipants";
import ExportParticipantsDialog from "./ExportParticipantsDialog";
import toast from "react-hot-toast";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import * as XLSX from "xlsx";
import useParticipants from "./participants/useParticipants";
import ParticipantToolbar from "./participants/ParticipantToolbar";
import ParticipantTable from "./participants/ParticipantTable";
import ParticipantFormModal from "./participants/ParticipantFormModal";
import ParticipantStatusDialog from "./participants/ParticipantStatusDialog";
import ParticipantDeleteDialog from "./participants/ParticipantDeleteDialog";
import ParticipantLinksDialog from "./participants/ParticipantLinksDialog";

function ManageParticipants() {
  const { token } = useAuth();
  const { hasRole } = usePermission();
  const { competition, groupLabel } = useCompetition();
  const isSuperAdmin = hasRole("super_admin");

  const {
    apiCall,
    groups,
    groupsLoading,
    participants,
    total,
    page,
    limit,
    setPage,
    isInitialLoading,
    isRefetching,
    error,
    setError,
    searchInput,
    setSearchInput,
    filterGroup,
    setFilterGroup,
    filterStatus,
    setFilterStatus,
    filterClass,
    setFilterClass,
    selectedIds,
    toggleSelect,
    selectPage,
    clearSelection,
    getGroupName,
    fetchParticipants,
    prependParticipant,
    removeParticipants,
    setParticipants,
  } = useParticipants({ token, competitionId: competition?._id });

  const [formOpen, setFormOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [formSaving, setFormSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const [statusTarget, setStatusTarget] = useState(null);
  const [statusValue, setStatusValue] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [bulkLinks, setBulkLinks] = useState(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);
  const [copyingLinks, setCopyingLinks] = useState(false);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error("Failed to copy")
    );
  };

  const openAdd = () => {
    setEditingParticipant(null);
    setFormOpen(true);
  };

  const openEdit = (stu) => {
    setEditingParticipant(stu);
    setFormOpen(true);
  };

  const handleFormSave = async (form) => {
    setError("");
    setFormSaving(true);
    try {
      if (editingParticipant) {
        const res = await apiCall(API_ROUTES.PARTICIPANTS.UPDATE(editingParticipant._id), {
          method: "PUT",
          body: JSON.stringify(form),
        });
        const updated = res?.participant || { ...editingParticipant, ...form };
        setParticipants((prev) => prev.map((row) => (row._id === updated._id ? { ...row, ...updated } : row)));
        toast.success("Participant updated");
      } else {
        const { participant, setup_link } = await apiCall(API_ROUTES.PARTICIPANTS.CREATE, {
          method: "POST",
          body: JSON.stringify(form),
        });
        prependParticipant(participant);
        toast.success("Participant added");
        if (setup_link) {
          setBulkLinks({
            links: [{ participant_id: participant._id, name: participant.name, email: participant.email, setup_link }],
            skippedActive: 0,
          });
          setLinksOpen(true);
        }
      }
      setFormOpen(false);
      setEditingParticipant(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleBulkLinks = async () => {
    if (!selectedIds.length) return;
    setLinksLoading(true);
    setError("");
    try {
      const res = await apiCall(API_ROUTES.PARTICIPANTS.SETUP_LINKS_BULK, {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds }),
      });
      setBulkLinks(res);
      setLinksOpen(true);
      if (res?.skippedActive > 0) {
        toast(`Skipped ${res.skippedActive} with password already set`, { icon: "ℹ️" });
      } else {
        toast.success(`Generated ${res?.links?.length || 0} setup links`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLinksLoading(false);
    }
  };

  const handleRegenerateSingle = async (stu) => {
    setLinksLoading(true);
    try {
      const res = await apiCall(API_ROUTES.PARTICIPANTS.SETUP_LINK_REGENERATE(stu._id), { method: "POST" });
      setBulkLinks({
        links: [{ participant_id: res.participant_id, name: res.name, email: res.email, setup_link: res.setup_link }],
        skippedActive: 0,
      });
      setLinksOpen(true);
      fetchParticipants({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLinksLoading(false);
    }
  };

  const copyAllBulkLinks = async () => {
    if (!bulkLinks?.links?.length) return;
    const text = bulkLinks.links
      .map((l) => `${l.name} <${l.email || "no-email"}>\n${l.setup_link}`)
      .join("\n\n");
    if (text.length > 18000) {
      toast.error("Too many links for clipboard — use Download Excel instead");
      return;
    }
    setCopyingLinks(true);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${bulkLinks.links.length} links copied to clipboard`);
    } catch {
      toast.error("Failed to copy");
    } finally {
      setCopyingLinks(false);
    }
  };

  const downloadBulkLinksExcel = () => {
    if (!bulkLinks?.links?.length) return;
    const wsData = [["Name", "Email", "Admission No", "Setup Link"]];
    bulkLinks.links.forEach((l) => {
      wsData.push([l.name, l.email || "", l.admission_no || "", l.setup_link]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 16 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Setup Links");
    XLSX.writeFile(wb, "Participant_Setup_Links.xlsx");
    toast.success("Excel downloaded — share manually (no auto-send)");
  };

  const handleStatusConfirm = async () => {
    if (!statusTarget || !statusValue) return;
    setStatusSaving(true);
    setError("");
    try {
      await apiCall(API_ROUTES.PARTICIPANTS.STATUS(statusTarget._id), {
        method: "PATCH",
        body: JSON.stringify({ status: statusValue, reason: statusReason }),
      });
      setStatusTarget(null);
      setStatusValue("");
      setStatusReason("");
      fetchParticipants({ silent: true });
      toast.success("Status updated");
    } catch (err) {
      setError(err.message);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    setError("");
    try {
      if (deleteTarget.type === "bulk") {
        await apiCall(API_ROUTES.PARTICIPANTS.BULK_DELETE, {
          method: "DELETE",
          body: JSON.stringify({ ids: selectedIds }),
        });
        removeParticipants(selectedIds);
        toast.success("Participants deleted");
      } else {
        await apiCall(API_ROUTES.PARTICIPANTS.DELETE(deleteTarget.id), { method: "DELETE" });
        removeParticipants([deleteTarget.id]);
        toast.success("Participant deleted");
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setFilterGroup("");
    setFilterStatus("");
    setFilterClass("");
    setPage(1);
  };

  return (
    <div className="min-h-dvh p-4 bg-background">
      <div className="mx-auto max-w-7xl space-y-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold mb-1 text-card-foreground">
            Participant Management
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage all participants, classes, and {groupLabel.toLowerCase()} mapping
          </p>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 bg-accent-red-tint border border-accent-red/20 text-accent-red px-3 py-2 rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <span className="flex-1 min-w-0 break-words">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => fetchParticipants()}>Retry</Button>
            <button
              onClick={() => setError("")}
              className="text-accent-red focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red rounded px-1"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <Card>
          <CardContent className="p-3 space-y-3">
            <ParticipantToolbar
              searchInput={searchInput}
              onSearchChange={setSearchInput}
              filterGroup={filterGroup}
              onGroupChange={setFilterGroup}
              filterStatus={filterStatus}
              onStatusChange={setFilterStatus}
              filterClass={filterClass}
              onClassChange={setFilterClass}
              groups={groups}
              groupsLoading={groupsLoading}
              groupLabel={groupLabel}
              total={total}
              isRefetching={isRefetching}
              selectedCount={selectedIds.length}
              onSelectPage={selectPage}
              onClearSelection={clearSelection}
              canSelectPage={participants.length > 0 && selectedIds.length === 0}
              isSuperAdmin={isSuperAdmin}
              onAdd={openAdd}
              onImport={() => setImportOpen(true)}
              onExport={() => setExportOpen(true)}
              onBulkLinks={handleBulkLinks}
              onBulkDelete={() => setDeleteTarget({ type: "bulk" })}
              linksLoading={linksLoading}
            />
            <ParticipantTable
              participants={participants}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onEdit={openEdit}
              onStatus={(stu) => { setStatusTarget(stu); setStatusValue(""); setStatusReason(""); }}
              onLink={handleRegenerateSingle}
              onDelete={(stu) => setDeleteTarget({ type: "single", id: stu._id })}
              getGroupName={getGroupName}
              groupLabel={groupLabel}
              isInitialLoading={isInitialLoading}
              isRefetching={isRefetching}
              linksLoading={linksLoading}
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
              onClearFilters={handleClearFilters}
              onAdd={openAdd}
            />
          </CardContent>
        </Card>
      </div>

      <ParticipantFormModal
        open={formOpen}
        initial={editingParticipant}
        groups={groups}
        groupLabel={groupLabel}
        saving={formSaving}
        onSave={handleFormSave}
        onClose={() => { setFormOpen(false); setEditingParticipant(null); }}
      />

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100%-2rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import participants</DialogTitle>
            <DialogDescription>
              Upload a CSV/Excel file. Setup links are shown on the Done step.
            </DialogDescription>
          </DialogHeader>
          {isSuperAdmin ? (
            <ImportParticipants
              groups={groups}
              groupLabel={groupLabel}
              onDone={() => { setImportOpen(false); fetchParticipants(); }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Import is available to super admins only.</p>
          )}
        </DialogContent>
      </Dialog>

      <ParticipantStatusDialog
        target={statusTarget}
        value={statusValue}
        reason={statusReason}
        onValueChange={setStatusValue}
        onReasonChange={setStatusReason}
        onConfirm={handleStatusConfirm}
        onClose={() => { setStatusTarget(null); setStatusValue(""); setStatusReason(""); }}
        saving={statusSaving}
      />

      <ParticipantDeleteDialog
        target={deleteTarget}
        selectedCount={selectedIds.length}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
        deleting={deleteSaving}
      />

      <ParticipantLinksDialog
        open={linksOpen}
        links={bulkLinks?.links}
        skippedActive={bulkLinks?.skippedActive || 0}
        copying={copyingLinks}
        onCopyAll={copyAllBulkLinks}
        onDownloadExcel={downloadBulkLinksExcel}
        onCopyOne={(link) => copyToClipboard(link.setup_link, `Link for ${link.name}`)}
        onClose={() => setLinksOpen(false)}
      />

      <ExportParticipantsDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        groups={groups}
        groupLabel={groupLabel}
      />
    </div>
  );
}

export default ManageParticipants;
