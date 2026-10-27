import type { Device } from "./types";

export type OfferCondition = "new" | "used" | "refurbished" | "open-box" | "unknown";
export type OfferConditionFilter = "all" | "new" | "used";
export type OfferMarketplace = "OLX" | "Mercado Livre" | "eBay" | "Shopee";

export interface OfferHardware {
  family: Device["family"];
  screenInches: number;
  year: number;
  chip: string;
  cpuCores: number;
  gpuCores: number | null;
  gpuName?: string;
  gpuMemoryGb?: number | null;
  memoryGb: number;
  storageGb: number;
}

/** Only author-reviewed product pages belong here. Search snippets are discovery, not evidence. */
export interface VerifiedOffer {
  id: string;
  deviceId?: string;
  hardware: OfferHardware;
  title: string;
  url: string;
  store: string;
  seller?: string;
  country: "BR";
  currency: "BRL";
  cashPrice: number;
  paymentMethod: string;
  shippingPrice: number | null;
  shippingNote: string;
  condition: OfferCondition;
  availability: "in-stock" | "out-of-stock" | "unknown";
  verifiedAt: string;
  verification: "page-reviewed" | "json-ld";
  evidence: string;
  refresh?: {
    sku?: string;
    productId?: string;
    /** Reviewer confirmed that this product's JSON-LD Offer.price is the cash price. */
    cashPriceIsExplicit: true;
    /** Exact fragments in this Product's JSON-LD for GPU, RAM, SSD and model identity. */
    requiredHardwareText: string[];
    /** Explicit, author-reviewed condition wording when itemCondition is absent. */
    requiredConditionText?: string;
  };
}

export interface OfferRefreshSummary {
  attempted: number;
  updated: number;
  failed: number;
  unsupported: number;
}

export interface OffersResponse {
  state: "ready" | "empty" | "needs-storage";
  deviceId: string;
  storageGb: number | null;
  condition: OfferConditionFilter;
  currency: "BRL";
  generatedAt: string;
  offers: VerifiedOffer[];
  excludedStaleCount: number;
  verificationMaxAgeHours: number;
  message: string;
  searchLinks: { label: string; url: string }[];
  refresh: OfferRefreshSummary | null;
}

export interface OfferCandidate {
  title: string;
  url: string;
  marketplace: OfferMarketplace;
  snippet: string;
  reason: string;
  reviewStatus: "search-candidate" | "listing-reviewed";
  /** Only manually reviewed listing data can populate this field, never search snippets. */
  observedPrice?: { amount: number; currency: "USD"; checkedAt: string };
}

export interface ReviewedOfferCandidate extends OfferCandidate {
  hardware: OfferHardware;
  condition: OfferCondition;
  reviewStatus: "listing-reviewed";
  evidence: string;
}

export interface OfferDiscoveryResponse {
  mode: "live" | "links";
  deviceId: string;
  storageGb: number | null;
  condition: OfferConditionFilter;
  query: string;
  candidates: OfferCandidate[];
  message: string;
  cached: boolean;
  discoveredAt: string | null;
  searchLinks: { label: string; url: string }[];
}
