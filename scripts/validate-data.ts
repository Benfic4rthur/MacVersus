import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { dataset } from "../src/data/catalog";
import { MAX_FEED_BYTES, mergeDatasetUpdate } from "../src/lib/dataset-updates";

async function main() {
const filename = resolve(process.argv[2] ?? "src/data/reviewed-updates.json");
try {
  if ((await stat(filename)).size > MAX_FEED_BYTES) throw new Error("O arquivo excede 2 MB.");
  const updated = mergeDatasetUpdate(dataset, JSON.parse(await readFile(filename, "utf8")));
  console.log(`Estrutura válida: ${updated.devices.length} configurações, ${updated.workloads.length} testes e ${updated.benchmarks.length} medições após a combinação.`);
  console.log("A validação não comprova os valores. Confira as publicações originais antes de incluir o arquivo na base.");
} catch (error) {
  console.error(`Feed rejeitado: ${error instanceof Error ? error.message : "arquivo inválido"}`);
  process.exitCode = 1;
}

}
void main();
