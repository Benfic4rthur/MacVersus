import { MacVersus } from "@/components/MacVersus";
import { loadDataset } from "@/lib/dataset-updates";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dataset = await loadDataset();
  return <MacVersus data={dataset} />;
}
