export interface PlantSearchOption {
  id: string;
  plantName: string;
  varietyName?: string;
  matchedOn: "plant" | "variety";
  label: string;
  subtitle?: string;
}

export interface SearchablePlantSource {
  id?: string;
  name?: string;
  plantName?: string;
  category?: string;
  varieties?: string[];
}

export function getTypeaheadPlantOptions(
  query: string,
  sources: SearchablePlantSource[],
  limit = 12
): PlantSearchOption[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const results: PlantSearchOption[] = [];

  for (const item of sources) {
    const baseName = (item.plantName ?? item.name ?? "").trim();
    if (!baseName) continue;

    const baseId = item.id ?? baseName.toLowerCase().replace(/\s+/g, "-");
    const plantMatches = baseName.toLowerCase().includes(trimmed);

    if (plantMatches) {
      results.push({
        id: `${baseId}::plant`,
        plantName: baseName,
        matchedOn: "plant",
        label: baseName,
        subtitle: item.category ? `${item.category} · Plant` : "Plant",
      });
    }

    if (Array.isArray(item.varieties)) {
      for (const rawVariety of item.varieties) {
        const variety = rawVariety.trim();
        if (!variety) continue;
        if (variety.toLowerCase().includes(trimmed)) {
          results.push({
            id: `${baseId}::variety::${variety.toLowerCase()}`,
            plantName: baseName,
            varietyName: variety,
            matchedOn: "variety",
            label: `${variety} (${baseName})`,
            subtitle: item.category ? `${item.category} · Variety` : "Variety",
          });
        }
      }
    }

    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}
