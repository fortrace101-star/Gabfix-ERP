import { useState } from "react";
import { DataTable, type Column } from "@/components/store/DataTable";
import { KpiCard, KpiStrip } from "@/components/store/KpiCard";
import { PageHeader } from "@/components/store/PageHeader";
import { StatusBadge } from "@/components/store/StatusBadge";
import { StoreButton } from "@/components/store/StoreButton";
import { ToolModal } from "@/components/store/StoreModals";
import type { Tool } from "@/lib/store-data";
import { useDocumentTitle } from "@/lib/use-document-title";
import { storeMutations, useWorkspace } from "@/lib/workspace";

function ToolsPage() {
  useDocumentTitle(
    "Tools & equipment — Gabfix Store",
    "Check tools out to employees and jobs, track due-back dates and record condition notes for Gabfix equipment.",
  );
  const ws = useWorkspace();
  const tools: Tool[] = ws.tools;
  const toolsOut = tools.filter((t) => t.status === "Checked out" || t.status === "Overdue");
  const overdue = tools.filter((t) => t.status === "Overdue").length;
  const repair = tools.filter((t) => t.status === "In repair").length;
  const [toolTarget, setToolTarget] = useState<Tool | null>(null);

  const columns: Column<Tool>[] = [
    {
      key: "name",
      header: "Tool",
      cell: (t) => (
        <div>
          <p className="font-medium text-foreground">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.code}</p>
        </div>
      ),
      sortValue: (t) => t.name,
      search: (t) => `${t.name} ${t.code}`,
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => <StatusBadge label={t.status} />,
      sortValue: (t) => t.status,
      search: (t) => t.status,
    },
    {
      key: "holder",
      header: "Held by",
      cell: (t) => (
        <div>
          <p className="text-foreground">{t.holder ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{t.job ?? "In store"}</p>
        </div>
      ),
      sortValue: (t) => t.holder ?? "",
      search: (t) => `${t.holder ?? ""} ${t.job ?? ""}`,
    },
    {
      key: "due",
      header: "Due back",
      cell: (t) => <span className="tabular text-muted-foreground">{t.dueBack ?? "—"}</span>,
      sortValue: (t) => t.dueBack ?? "",
    },
    {
      key: "condition",
      header: "Condition",
      cell: (t) => <StatusBadge label={t.condition} />,
      sortValue: (t) => t.condition,
      search: (t) => t.condition,
    },
    {
      key: "notes",
      header: "Notes",
      cell: (t) => <span className="text-xs text-muted-foreground">{t.notes || "No notes"}</span>,
      search: (t) => t.notes,
    },
    {
      key: "action",
      header: "",
      align: "right",
      cell: (t) => (
        <StoreButton
          variant={t.status === "In store" ? "primary" : "outline"}
          className="h-8"
          onClick={() => setToolTarget(t)}
        >
          {t.status === "In store" ? "Check out" : "Check in"}
        </StoreButton>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Store"
        title="Tools & equipment"
        description="Check tools out to an employee and job, track due-back dates and log condition on return. The asset register and depreciation sit in the Admin Console."
        actions={
          <StoreButton variant="primary" onClick={() => tools[0] && setToolTarget(tools[0])}>
            New check-out
          </StoreButton>
        }
      />

      <KpiStrip>
        <KpiCard label="Tools registered" value={String(tools.length)} hint="Store-held assets" />
        <KpiCard
          label="Out in the field"
          value={String(toolsOut.length)}
          hint="Checked out or overdue"
        />
        <KpiCard
          label="Overdue returns"
          value={String(overdue)}
          hint="Chase the holder"
          delta={overdue ? "Action needed" : "Clear"}
          deltaTone={overdue ? "negative" : "positive"}
        />
        <KpiCard label="In repair" value={String(repair)} hint="Awaiting workshop" />
      </KpiStrip>

      <DataTable
        columns={columns}
        rows={tools}
        searchPlaceholder="Search tool, code, holder or job..."
        actions={<StoreButton variant="ghost">Filters</StoreButton>}
      />

      <ToolModal
        open={Boolean(toolTarget)}
        tool={toolTarget}
        onClose={() => setToolTarget(null)}
        onSubmit={async (patch) => {
          if (toolTarget) await storeMutations.updateTool(toolTarget.id, patch);
        }}
      />
    </>
  );
}

export default ToolsPage;
