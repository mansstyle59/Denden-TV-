import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeCategory(cat: string | undefined): string {
  if (!cat) return 'Généralistes';
  const n = cat.toLowerCase();
  
  // Clean up typical M3U prefixes/suffixes like |FR|, ***, === etc.
  let clean = cat.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim();
  if (n.includes('fr |') || n.includes('fr:')) {
    clean = clean.replace(/fr\s*[|:]\s*/i, '').trim();
  }
  if (!clean) return 'Généralistes';

  if (n.includes('général') || n.includes('tnt') || n.includes('national')) return 'Généralistes';
  if (n.includes('ciné') || n.includes('film') || n.includes('cinema') || n.includes('movie')) return 'Cinéma & Séries';
  if (n.includes('série') || n.includes('series') || n.includes('vod')) return 'Cinéma & Séries';
  if (n.includes('sport')) return 'Sports';
  if (n.includes('jeunesse') || n.includes('kid') || n.includes('enfant') || n.includes('anime') || n.includes('dessin')) return 'Jeunesse';
  if (n.includes('info') || n.includes('news') || n.includes('actualité')) return 'Information';
  if (n.includes('doc') || n.includes('découverte') || n.includes('animaux') || n.includes('histoire') || n.includes('science')) return 'Documentaires';
  if (n.includes('musique') || n.includes('music')) return 'Musique';
  if (n.includes('divertissement') || n.includes('entertainment') || n.includes('show')) return 'Divertissement';
  if (n.includes('adulte') || n.includes('xxx') || n.includes('18+')) return 'Adulte';
  if (n.includes('régional') || n.includes('region')) return 'Régional';
  if (n.includes('culture') || n.includes('art')) return 'Culture';
  
  // Attempt to capitalize properly if it doesn't match standard
  if (clean.length > 2) {
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }
  return 'Généralistes';
}
