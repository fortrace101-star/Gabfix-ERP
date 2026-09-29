import { useEffect, useState } from "react";
import { portalApi } from "@/lib/api";

/**
 * Live-data layer (plan v5 D1): jobs assigned to the signed-in technician
 * from GET /api/data + lifecycle actions via PATCH /api/jobs/:id/status.
 */

type JobRow = {
  id: string;
  number: string;
  customerId: string | null;
  serviceId: string | null;
  date: string;
  status: string;
  revenue: number;
  cost: number;
  assignees: string[];
};

export type PortalJob = {
  id: string;
  number: string;
  customer: string;
  service: string;
  status: string;
  date: string;
  revenue: number;
  mine: boolean;
};

export function useMyJobs(employeeName: string | null) {
  const [jobs, setJobs] = useState<PortalJob[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    portalApi
      .get<{ jobs: JobRow[]; customers: Array<{ id: string; name: string }>; services: Array<{ id: string; name: string }> }>(
        "/data",
      )
      .then((ws) => {
        if (!alive) return;
        const nameOf = (id: string | null) => ws.customers.find((c) => c.id === id)?.name ?? "Customer";
        const serviceOf = (id: string | null) => ws.services.find((s) => s.id === id)?.name ?? "Service";
        const mapped: PortalJob[] = ws.jobs.map((row) => ({
          id: row.id,
          number: row.number,
          customer: nameOf(row.customerId),
          service: serviceOf(row.serviceId),
          status: row.status,
          date: row.date,
          revenue: row.revenue,
          mine:
            !employeeName ||
            row.assignees.some((a) => a.toLowerCase().includes(employeeName.split(" ")[0]?.toLowerCase() ?? "")),
        }));
        setJobs(mapped);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load jobs");
      });
    return () => {
      alive = false;
    };
  }, [employeeName]);

  return { jobs, error };
}

/** Lifecycle transition — the server stamps the timeline (D2). */
export async function setJobStatus(jobId: string, status: string): Promise<void> {
  await portalApi.request(`/jobs/${jobId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/** SSE subscription: jobs change in any app → refresh here. */
export function subscribeToJobEvents(onChange: () => void): () => void {
  const base = portalApi.baseUrl;
  if (!base || typeof EventSource === "undefined") return () => undefined;
  const token = localStorage.getItem("gabfix:auth-token");
  const url = token ? `${base}/events?access_token=${encodeURIComponent(token)}` : `${base}/events`;
  const es = new EventSource(url);
  for (const type of ["job-created", "job-updated", "workspace-reset"]) {
    es.addEventListener(type, onChange);
  }
  return () => es.close();
}
