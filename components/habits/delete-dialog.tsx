"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/app/app-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import type { Objective } from "@/lib/types";

export function DeleteObjectiveDialog({ objective, checkIns, open, onOpenChange }: { objective: Objective; checkIns: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { actions } = useApp();
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (kind: "delete" | "archive") =>
    start(async () => {
      const res = kind === "delete" ? await actions.deleteObjective(objective.id) : await actions.setObjectiveStatus(objective.id, "archived");
      if (!res.ok) return void toast.error(res.error);
      toast.success(kind === "delete" ? "Objective deleted" : "Objective archived");
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        role="alertdialog"
        title={`Delete “${objective.title}”?`}
        description={
          checkIns > 0
            ? `This permanently removes the objective and its ${checkIns} check-in${checkIns === 1 ? "" : "s"}. Other objectives are not affected. This can't be undone.`
            : "This permanently removes the objective. Other objectives are not affected. This can't be undone."
        }
      >
        <p className="text-sm text-muted">To stop tracking but keep its history in your statistics, archive it instead.</p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          {objective.status === "active" && (
            <Button onClick={() => run("archive")} disabled={pending}>
              Archive instead
            </Button>
          )}
          <Button variant="danger" onClick={() => run("delete")} disabled={pending}>
            {pending ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
