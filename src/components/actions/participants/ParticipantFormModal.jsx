import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";
import { Loader2 } from "lucide-react";

const EMPTY_FORM = { name: "", class: "", group_id: "", admission_no: "", phone: "", email: "", gender: "" };

export default function ParticipantFormModal({ open, initial, groups, groupLabel, saving, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name || "",
        class: initial.class || "",
        group_id: initial.group_id?._id || initial.group_id || "",
        admission_no: initial.admission_no || "",
        phone: initial.phone || "",
        email: initial.email || "",
        gender: initial.gender || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, initial]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100%-2rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit participant" : "Add participant"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update details. Group changes also update the competition enrollment." : "Creates the participant and mints a one-time setup link to share."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); onSave(form); }}
        >
          <div>
            <Label htmlFor="pf-group" className="sr-only">{groupLabel}</Label>
            <Select value={form.group_id} onValueChange={(val) => setForm((f) => ({ ...f, group_id: val }))}>
              <SelectTrigger id="pf-group" className="min-h-11">
                <SelectValue placeholder={`Select ${groupLabel} *`} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group._id} value={group._id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pf-name" className="sr-only">Name</Label>
              <Input id="pf-name" required placeholder="Name *" value={form.name} onChange={set("name")} className="min-h-11" />
            </div>
            <div>
              <Label htmlFor="pf-class" className="sr-only">Class</Label>
              <Input id="pf-class" required placeholder="Class *" value={form.class} onChange={set("class")} className="min-h-11" />
            </div>
            <div>
              <Label htmlFor="pf-admission" className="sr-only">Admission No</Label>
              <Input id="pf-admission" placeholder="Admission No" value={form.admission_no} onChange={set("admission_no")} className="min-h-11" />
            </div>
            <div>
              <Label htmlFor="pf-phone" className="sr-only">Phone</Label>
              <Input id="pf-phone" placeholder="Phone" value={form.phone} onChange={set("phone")} className="min-h-11" />
            </div>
            <div>
              <Label htmlFor="pf-email" className="sr-only">Email</Label>
              <Input id="pf-email" type="email" placeholder="Email" value={form.email} onChange={set("email")} className="min-h-11" />
            </div>
            <div>
              <Label htmlFor="pf-gender" className="sr-only">Gender</Label>
              <Select value={form.gender} onValueChange={(val) => setForm((f) => ({ ...f, gender: val }))}>
                <SelectTrigger id="pf-gender" className="min-h-11">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="min-h-11 bg-accent-amber text-white hover:bg-accent-amber/90">
              {saving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</>) : (initial ? "Save changes" : "Add participant")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
