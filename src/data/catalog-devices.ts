import type { Device } from "@/lib/types";

// Hardware specifications only, never benchmark estimates. Each source is Apple's
// specification sheet. RAM choices are constrained to the actual CPU/GPU bin.
const catalog: Device[] = [];
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Official M5 Air specification sheets 126320 and 126321, checked 2026-10-27.
for (const screen of [13.6, 15.3]) {
  for (const gpu of screen === 13.6 ? [8, 10] : [10]) {
    for (const ram of [16, 24, 32]) catalog.push({
      id: `mba${Math.floor(screen)}-2026-m5-c10-g${gpu}-r${ram}`,
      name: `MacBook Air ${Math.floor(screen)}"`, family: "MacBook Air", screenInches: screen,
      year: 2026, chip: "M5", architecture: "apple-silicon", cpuCores: 10, gpuCores: gpu,
      memoryGb: ram, storageGb: null, bandwidthGbps: 153,
      specUrl: `https://support.apple.com/en-us/${screen === 13.6 ? "126320" : "126321"}`,
    });
  }
}

function silicon(screen: number, year: number, chip: string, cpu: number, gpu: number,
  memory: number[], bandwidth: number | null, article: string) {
  for (const ram of memory) catalog.push({
    id: `mbp${Math.floor(screen)}-${year}-${slug(chip)}-c${cpu}-g${gpu}-r${ram}`,
    name: `MacBook Pro ${Math.floor(screen)}"`, family: "MacBook Pro", screenInches: screen,
    year, chip, architecture: "apple-silicon", cpuCores: cpu, gpuCores: gpu,
    memoryGb: ram, storageGb: null, bandwidthGbps: bandwidth,
    specUrl: `https://support.apple.com/en-us/${article}`,
  });
}

function intel(screen: number, year: number, chip: string, cpu: number, gpu: string,
  vram: number | null, memory: number[], article: string, suffix = "") {
  for (const ram of memory) catalog.push({
    id: `mbp${Math.floor(screen)}-${year}-${slug(chip)}-${slug(gpu)}-v${vram ?? 0}-r${ram}`,
    name: `MacBook Pro ${Math.floor(screen)}"${suffix ? ` (${suffix})` : ""}`,
    family: "MacBook Pro", screenInches: screen, year, chip, architecture: "intel",
    cpuCores: cpu, gpuCores: null, gpuName: gpu, gpuMemoryGb: vram,
    memoryGb: ram, storageGb: null, bandwidthGbps: null,
    specUrl: `https://support.apple.com/en-us/${article}`,
  });
}

// All MacBook Pro product families released from the last 2019 Intel generation
// through the officially released M5 Pro / Max models (checked 2026-10-27).
for (const [screen, article] of [[14.2, "126318"], [16.2, "126319"]] as const) {
  if (screen === 14.2) silicon(screen, 2026, "M5 Pro", 15, 16, [24, 48], 307, article);
  silicon(screen, 2026, "M5 Pro", 18, 20, [24, 48, 64], 307, article);
  silicon(screen, 2026, "M5 Max", 18, 32, [36], 460, article);
  silicon(screen, 2026, "M5 Max", 18, 40, [48, 64, 128], 614, article);
}
silicon(14.2, 2025, "M5", 10, 10, [16, 24, 32], 153, "125405");

for (const [screen, article] of [[14.2, "121553"], [16.2, "121554"]] as const) {
  if (screen === 14.2) silicon(screen, 2024, "M4 Pro", 12, 16, [24, 48], 273, article);
  silicon(screen, 2024, "M4 Pro", 14, 20, [24, 48], 273, article);
  silicon(screen, 2024, "M4 Max", 14, 32, [36], 410, article);
  silicon(screen, 2024, "M4 Max", 16, 40, [48, 64, 128], 546, article);
}
silicon(14.2, 2024, "M4", 10, 10, [16, 24, 32], 120, "121552");

for (const [screen, article] of [[14.2, "117736"], [16.2, "117737"]] as const) {
  if (screen === 14.2) silicon(screen, 2023, "M3 Pro", 11, 14, [18, 36], 150, article);
  silicon(screen, 2023, "M3 Pro", 12, 18, [18, 36], 150, article);
  silicon(screen, 2023, "M3 Max", 14, 30, [36, 96], 300, article);
  silicon(screen, 2023, "M3 Max", 16, 40, [48, 64, 128], 400, article);
}
silicon(14.2, 2023, "M3", 8, 10, [8, 16, 24], 100, "117735");

for (const [screen, article] of [[14.2, "111340"], [16.2, "111838"]] as const) {
  if (screen === 14.2) silicon(screen, 2023, "M2 Pro", 10, 16, [16, 32], 200, article);
  silicon(screen, 2023, "M2 Pro", 12, 19, [16, 32], 200, article);
  silicon(screen, 2023, "M2 Max", 12, 30, [32, 64], 400, article);
  silicon(screen, 2023, "M2 Max", 12, 38, [32, 64, 96], 400, article);
}
silicon(13.3, 2022, "M2", 8, 10, [8, 16, 24], 100, "111869");

for (const [screen, article] of [[14.2, "111902"], [16.2, "111901"]] as const) {
  if (screen === 14.2) {
    silicon(screen, 2021, "M1 Pro", 8, 14, [16, 32], 200, article);
    silicon(screen, 2021, "M1 Pro", 10, 14, [16, 32], 200, article);
  }
  silicon(screen, 2021, "M1 Pro", 10, 16, [16, 32], 200, article);
  silicon(screen, 2021, "M1 Max", 10, 24, [32, 64], 400, article);
  silicon(screen, 2021, "M1 Max", 10, 32, [32, 64], 400, article);
}
silicon(13.3, 2020, "M1", 8, 8, [8, 16], null, "111893");

for (const year of [2019, 2020]) {
  const article = year === 2019 ? "111945" : "111981";
  intel(13.3, year, "Intel Core i5 1.4 GHz", 4, "Intel Iris Plus 645", null, [8, 16], article, "2 portas");
  intel(13.3, year, "Intel Core i7 1.7 GHz", 4, "Intel Iris Plus 645", null, [8, 16], article, "2 portas");
}
intel(13.3, 2019, "Intel Core i5 2.4 GHz", 4, "Intel Iris Plus 655", null, [8, 16], "111997", "4 portas");
intel(13.3, 2019, "Intel Core i7 2.8 GHz", 4, "Intel Iris Plus 655", null, [8, 16], "111997", "4 portas");
intel(13.3, 2020, "Intel Core i5 2.0 GHz", 4, "Intel Iris Plus Graphics", null, [16, 32], "111339", "4 portas");
intel(13.3, 2020, "Intel Core i7 2.3 GHz", 4, "Intel Iris Plus Graphics", null, [16, 32], "111339", "4 portas");

for (const gpu of ["Radeon Pro 555X", "Radeon Pro 560X"]) {
  intel(15.4, 2019, "Intel Core i7 2.6 GHz", 6, gpu, 4, [16, 32], "111941");
}
for (const cpu of ["Intel Core i9 2.3 GHz", "Intel Core i9 2.4 GHz"]) {
  for (const gpu of ["Radeon Pro 560X", "Radeon Pro Vega 16", "Radeon Pro Vega 20"]) {
    intel(15.4, 2019, cpu, 8, gpu, 4, [16, 32], "111941");
  }
}
// The i9 2.4 GHz was also available as a processor upgrade of the 555X model.
intel(15.4, 2019, "Intel Core i9 2.4 GHz", 8, "Radeon Pro 555X", 4, [16, 32], "111941");

for (const [chip, cores] of [["Intel Core i7 2.6 GHz", 6], ["Intel Core i9 2.3 GHz", 8], ["Intel Core i9 2.4 GHz", 8]] as const) {
  const graphics: [string, number][] = [
    ["Radeon Pro 5500M", 4], ["Radeon Pro 5500M", 8], ["Radeon Pro 5600M", 8],
  ];
  if (chip !== "Intel Core i9 2.3 GHz") graphics.unshift(["Radeon Pro 5300M", 4]);
  for (const [gpu, vram] of graphics) intel(16, 2019, chip, cores, gpu, vram, [16, 32, 64], "111932");
}

export const catalogDevices: Device[] = catalog;

/** Preserve precise measured hardware; do not attach its result to sibling bins. */
export function mergeDevices(measured: Device[], extra: Device[] = []): Device[] {
  const result: Device[] = [];
  const seen = new Set<string>();
  for (const item of [...measured, ...extra, ...catalogDevices]) {
    const key = [item.family, item.screenInches, item.year, item.chip, item.cpuCores,
      item.gpuCores, item.gpuName ?? "", item.gpuMemoryGb ?? "", item.memoryGb].join("|");
    if (!seen.has(key)) { result.push(item); seen.add(key); }
  }
  return result;
}
