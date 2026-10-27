export type Category = "games" | "llms" | "apps";
export type Metric = "fps" | "tokens/s" | "seconds" | "score" | "MB/s";

export interface Device {
  id: string;
  name: string;
  family: "MacBook Pro" | "MacBook Air";
  year: number;
  chip: string;
  cpuCores: number;
  gpuCores: number | null;
  architecture?: "apple-silicon" | "intel";
  gpuName?: string;
  gpuMemoryGb?: number | null;
  memoryGb: number;
  storageGb: number | null;
  bandwidthGbps: number | null;
  screenInches: number;
  specUrl: string;
}

export interface Workload {
  id: string;
  category: Category;
  name: string;
  subtitle: string;
  metric: Metric;
  higherIsBetter: boolean;
  description: string;
  sourceUrl?: string;
}

export interface BenchmarkSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  accessedAt: string;
}

export interface Benchmark {
  id: string;
  deviceId: string;
  workloadId: string;
  value: number;
  sourceId: string;
  conditions: Record<string, string>;
  quality: "documented" | "partial";
  missingFields: string[];
  // Only identical, sufficiently documented protocols can share a non-null key.
  comparabilityKey: string | null;
  notes: string;
  reportedHardware: string;
  // Source-specific overrides: undefined inherits Device; null stays unknown.
  testedStorageGb?: number | null;
  testedScreenInches?: number | null;
  // Runtime-only reference for FPS/tokens/s; never changes the tested hardware.
  storageReference?: { testedStorageGb: number | null; selectedStorageGb: number | null };
  hardwareReference?: {
    testedMemoryGb: number;
    selectedMemoryGb: number;
    testedScreenInches: number | null;
    selectedScreenInches: number;
    differences: ("memory" | "screen")[];
  };
}

export interface Dataset {
  updatedAt: string;
  devices: Device[];
  workloads: Workload[];
  benchmarks: Benchmark[];
  sources: BenchmarkSource[];
}

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  publisher: string;
  publishedAt: string | null;
}

export interface ResearchResponse {
  mode: "live" | "catalog";
  query: string;
  results: ResearchResult[];
  message: string;
  cached: boolean;
  searchLinks: { label: string; url: string }[];
}
