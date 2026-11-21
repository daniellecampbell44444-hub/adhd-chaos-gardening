export type PreservationMethod = 'Drying' | 'Sauces & Curds' | 'Pickles' | 'Freezing';

export interface PreservationSuggestion {
  id: string;
  cropLabel: string;
  totalGrams: number;
  method: PreservationMethod;
  summary: string;
  tip: string;
  reminderTitle: string;
}

export function getSurplusPreservationSuggestions(
  harvests: { crop: string; grams: number; date: string }[],
  minSurplusGrams = 400
): PreservationSuggestion[] {
  if (!harvests || harvests.length === 0) return [];

  const totalsByCrop = new Map<string, number>();
  for (const h of harvests) {
    const cleanName = h.crop.trim();
    if (!cleanName) continue;
    totalsByCrop.set(cleanName, (totalsByCrop.get(cleanName) || 0) + (h.grams || 0));
  }

  const suggestions: PreservationSuggestion[] = [];

  for (const [cropLabel, totalGrams] of totalsByCrop.entries()) {
    if (totalGrams < minSurplusGrams) continue;
    const lower = cropLabel.toLowerCase();

    if (
      lower.includes('chilli') ||
      lower.includes('chili') ||
      lower.includes('pepper') ||
      lower.includes('jalapeno') ||
      lower.includes('habanero') ||
      lower.includes('cayenne')
    ) {
      suggestions.push({
        id: `dry-${cropLabel}`,
        cropLabel,
        totalGrams,
        method: 'Drying',
        summary: `Dehydrate sliced chillies into flakes or chilli powder, or pickle whole/sliced pods.`,
        tip: 'Dry in a well-ventilated spot or dehydrator until crisp, then seal airtight.',
        reminderTitle: `Dehydrate ${totalGrams}g surplus ${cropLabel} into flakes/powder`,
      });
      suggestions.push({
        id: `pickle-${cropLabel}`,
        cropLabel,
        totalGrams,
        method: 'Pickles',
        summary: `Quick-pickle or brine-pickle chillies for burgers, tacos, and savoury jars.`,
        tip: 'Pack sliced or whole pods into jars with vinegar, salt, garlic, and spice.',
        reminderTitle: `Pickle surplus ${cropLabel} (${totalGrams}g logged)`,
      });
      continue;
    }

    if (lower.includes('tomato')) {
      suggestions.push({
        id: `sauce-${cropLabel}`,
        cropLabel,
        totalGrams,
        method: 'Sauces & Curds',
        summary: `Simmer down into passata, pasta base, or rich BBQ/chilli sauce.`,
        tip: 'Cook slowly to concentrate flavour, then cool, freeze in portions, or process safely.',
        reminderTitle: `Simmer ${totalGrams}g ${cropLabel} into sauce or passata`,
      });
      suggestions.push({
        id: `dry-${cropLabel}`,
        cropLabel,
        totalGrams,
        method: 'Drying',
        summary: `Slice and dehydrate into sun-dried style tomatoes or tomato powder.`,
        tip: 'Dry until leathery for oil/pantry use or crisp to mill into seasoning powder.',
        reminderTitle: `Slice & dehydrate ${totalGrams}g ${cropLabel}`,
      });
      continue;
    }

    if (lower.includes('cucumber') || lower.includes('onion') || lower.includes('zucchini')) {
      suggestions.push({
        id: `pickle-${cropLabel}`,
        cropLabel,
        totalGrams,
        method: 'Pickles',
        summary: `Turn into sweet mustard pickles, dill/vinegar spears, or pickled relish.`,
        tip: 'Slice evenly so brine penetrates cleanly; keep crunchy vegetables crisp.',
        reminderTitle: `Make pickles from ${totalGrams}g ${cropLabel}`,
      });
      suggestions.push({
        id: `freeze-${cropLabel}`,
        cropLabel,
        totalGrams,
        method: 'Freezing',
        summary: lower.includes('zucchini')
          ? `Grate or slice zucchini and freeze in meal-sized bags for baking or stir-fries.`
          : `Trim, portion, and freeze in zip/vacuum bags for quick cooking.`,
        tip: 'Squeeze excess moisture from grated zucchini before freezing.',
        reminderTitle: `Portion & freeze ${totalGrams}g ${cropLabel}`,
      });
      continue;
    }

    if (
      lower.includes('lemon') ||
      lower.includes('orange') ||
      lower.includes('lime') ||
      lower.includes('grapefruit') ||
      lower.includes('apple') ||
      lower.includes('pineapple') ||
      lower.includes('melon') ||
      lower.includes('banana')
    ) {
      suggestions.push({
        id: `dry-${cropLabel}`,
        cropLabel,
        totalGrams,
        method: 'Drying',
        summary: `Dehydrate slices/rings for snacks or teas, and candy leftover peels/rinds.`,
        tip: 'Thin even slices dry fastest; save peels/rinds for candying or zest powder.',
        reminderTitle: `Dehydrate ${totalGrams}g ${cropLabel} slices & save peels`,
      });
      if (lower.includes('lemon') || lower.includes('lime') || lower.includes('apple')) {
        suggestions.push({
          id: `sauce-${cropLabel}`,
          cropLabel,
          totalGrams,
          method: 'Sauces & Curds',
          summary: lower.includes('apple')
            ? `Cook down into spiced apple butter or compote.`
            : `Whisk up citrus curd or juice/zest portions for baking and drinks.`,
          tip: 'Freeze extra juice in ice cube trays so nothing goes unused.',
          reminderTitle: `Make curd/butter or freeze juice from ${totalGrams}g ${cropLabel}`,
        });
      }
      continue;
    }

    if (
      lower.includes('spinach') ||
      lower.includes('bok choy') ||
      lower.includes('broccoli') ||
      lower.includes('pea') ||
      lower.includes('bean')
    ) {
      suggestions.push({
        id: `freeze-${cropLabel}`,
        cropLabel,
        totalGrams,
        method: 'Freezing',
        summary: `Blanch briefly, shock in cold water, drain well, and freeze in meal portions.`,
        tip: 'Blanching locks in colour and texture for stir-fries, curries, and soups.',
        reminderTitle: `Blanch & freeze ${totalGrams}g ${cropLabel}`,
      });
      suggestions.push({
        id: `dry-${cropLabel}`,
        cropLabel,
        totalGrams,
        method: 'Drying',
        summary: `Dehydrate greens or herbs until crisp to crumble into soup/stock powders.`,
        tip: 'Store dried leaf powder in dark/airtight jars away from humidity.',
        reminderTitle: `Dehydrate ${totalGrams}g ${cropLabel} for soup/stock stash`,
      });
      continue;
    }

    // Default fallback for any other surplus harvest (e.g., potato, berry, herb)
    suggestions.push({
      id: `freeze-${cropLabel}`,
      cropLabel,
      totalGrams,
      method: 'Freezing',
      summary: `Freeze extra ${cropLabel} in labelled portions so surplus stays ready for meals.`,
      tip: 'Label with crop name and date before freezing.',
      reminderTitle: `Preserve ${totalGrams}g surplus ${cropLabel} (freeze or dry)`,
    });
    suggestions.push({
      id: `dry-${cropLabel}`,
      cropLabel,
      totalGrams,
      method: 'Drying',
      summary: `Dehydrate slices or pieces for lightweight pantry storage and snacking.`,
      tip: 'Condition dried items in a jar for a few days to check for stray moisture.',
      reminderTitle: `Consider dehydrating ${totalGrams}g ${cropLabel}`,
    });
  }

  return suggestions;
}
