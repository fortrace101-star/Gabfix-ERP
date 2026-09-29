import { useParams } from "react-router-dom";
import { LaundryDashboard } from "@/components/gabfix/laundry-dashboard";
import { useDocumentTitle } from "@/lib/use-document-title";

/** Maps the react-router :section param to the laundry dashboard. */
export default function DashboardPage() {
  const { section } = useParams<{ section: string }>();
  const active = section ?? "overview";

  useDocumentTitle(
    `${active.charAt(0).toUpperCase() + active.slice(1)} — Gabfix Laundry`,
    "Gabfix Laundry Front Office operations workspace.",
  );

  return <LaundryDashboard active={active} />;
}
