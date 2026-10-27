import { createRoot } from "react-dom/client";
import { MacVersus } from "./components/MacVersus";
import { dataset } from "./data/catalog";
import reviewedUpdates from "./data/reviewed-updates.json";
import { verifiedOffers } from "./data/offers";
import { mergeDatasetUpdate } from "./lib/dataset-updates";
import "./app/globals.css";
import "./components/radar-profile.css";
import "./app/workbench.css";

const publishedData = mergeDatasetUpdate(dataset, reviewedUpdates);
const root = document.getElementById("root");
if (!root) throw new Error("Elemento inicial da prévia não encontrado.");
createRoot(root).render(<MacVersus data={publishedData} staticPreview previewOffers={verifiedOffers} />);
