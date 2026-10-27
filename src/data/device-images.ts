import type { Device } from "@/lib/types";

export interface DeviceImage {
  src: string;
  alt: string;
  credit: string;
  sourceUrl: string;
}

const official = (file: string, chassis: string, sourceUrl: string): DeviceImage => ({
  src: `/images/${file}`,
  alt: `Imagem oficial Apple do ${chassis}. Representa o chassi; cor, GPU, memória e SSD podem variar.`,
  credit: "Apple · imagem representativa do chassi",
  sourceUrl,
});

const images = {
  airM1: official("macbook-air-m1.webp", "MacBook Air M1 de 13 polegadas", "https://support.apple.com/pt-br/111883"),
  airM5Small: official("macbook-air-13-m5.webp", "MacBook Air M5 de 13 polegadas", "https://www.apple.com/macbook-air/specs/"),
  airM5Large: official("macbook-air-15-m5.webp", "MacBook Air M5 de 15 polegadas", "https://www.apple.com/macbook-air/specs/"),
  intel13Old: official("macbook-pro-13-intel-2019.webp", "MacBook Pro Intel de 13 polegadas de 2019", "https://support.apple.com/pt-br/111997"),
  intel13: official("macbook-pro-13-intel-2020.webp", "MacBook Pro Intel de 13 polegadas de 2020", "https://support.apple.com/pt-br/111339"),
  intel15: official("macbook-pro-15-intel-2019.webp", "MacBook Pro Intel de 15 polegadas de 2019", "https://support.apple.com/pt-br/111941"),
  intel16: official("macbook-pro-16-intel-2019.webp", "MacBook Pro Intel de 16 polegadas de 2019", "https://support.apple.com/pt-br/111932"),
  pro13M1: official("macbook-pro-13-m1.webp", "MacBook Pro M1 de 13 polegadas", "https://support.apple.com/pt-br/111893"),
  pro13M2: official("macbook-pro-13-m2.webp", "MacBook Pro M2 de 13 polegadas", "https://support.apple.com/pt-br/111869"),
  pro14: official("macbook-pro-14-silicon.webp", "MacBook Pro de 14 polegadas de 2021, representativo da família Apple Silicon", "https://support.apple.com/pt-br/111902"),
  pro16: official("macbook-pro-16-silicon.webp", "MacBook Pro de 16 polegadas de 2021, representativo da família Apple Silicon", "https://support.apple.com/pt-br/111901"),
  pro14Recent: official("macbook-pro-14-m4.webp", "MacBook Pro de 14 polegadas de 2024, representativo da família Apple Silicon", "https://support.apple.com/pt-br/121553"),
  pro16Recent: official("macbook-pro-16-m4.webp", "MacBook Pro de 16 polegadas de 2024, representativo da família Apple Silicon", "https://support.apple.com/pt-br/121554"),
};

/** Photos identify the product family and chassis, never the internals of an offer. */
export function getDeviceImage(device: Device): DeviceImage | null {
  if (device.family === "MacBook Air") {
    if (device.chip === "M1") return images.airM1;
    if (device.chip === "M5") return device.screenInches >= 15 ? images.airM5Large : images.airM5Small;
    return null;
  }
  const isIntel = device.architecture === "intel" || device.chip.startsWith("Intel");
  if (isIntel) {
    if (device.screenInches >= 16) return images.intel16;
    if (device.screenInches >= 15) return images.intel15;
    return device.year >= 2020 ? images.intel13 : images.intel13Old;
  }
  if (device.screenInches < 14) return device.chip === "M2" ? images.pro13M2 : images.pro13M1;
  const recent = device.year >= 2024 || /^M3 (Pro|Max)$/.test(device.chip);
  if (device.screenInches >= 16) return recent ? images.pro16Recent : images.pro16;
  return recent ? images.pro14Recent : images.pro14;
}
