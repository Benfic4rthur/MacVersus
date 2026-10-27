import type { Device } from "./types";
import type { OfferConditionFilter } from "./offer-types";

export function offerSearchQuery(device: Device, storageGb: number | null, condition: OfferConditionFilter = "all"): string {
  const gpu = device.gpuName ?? `${device.gpuCores} núcleos GPU`;
  const storage = storageGb === null ? "" : `${storageGb >= 1024 ? `${storageGb / 1024}TB` : `${storageGb}GB`} SSD`;
  const conditionText = condition === "used" ? "usado seminovo" : condition === "new" ? "novo" : "";
  return `${device.family} ${Math.floor(device.screenInches)} ${device.year} ${device.chip} ${device.cpuCores} CPU ${gpu} ${device.memoryGb}GB RAM ${storage} ${conditionText}`.replace(/\s+/gu, " ").trim();
}

export function offerSearchLinks(device: Device, storageGb: number | null, condition: OfferConditionFilter = "all") {
  const query = encodeURIComponent(offerSearchQuery(device, storageGb, condition));
  const storage = storageGb === null ? "" : storageGb >= 1024 ? `${storageGb / 1024}TB SSD` : `${storageGb}GB SSD`;
  const ebayQuery = encodeURIComponent([
    device.family, Math.floor(device.screenInches), device.chip, `${device.memoryGb}GB RAM`, storage,
    device.gpuName ?? `${device.gpuCores}-core GPU`, condition === "used" ? "used" : condition === "new" ? "new" : "",
  ].filter(Boolean).join(" "));
  return [
    { label: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${query}` },
    { label: "OLX", url: `https://www.olx.com.br/brasil?q=${query}` },
    { label: "Mercado Livre", url: `https://lista.mercadolivre.com.br/${query}` },
    { label: "eBay", url: `https://www.ebay.com/sch/i.html?_nkw=${ebayQuery}` },
    { label: "Shopee", url: `https://shopee.com.br/search?keyword=${query}` },
  ];
}
