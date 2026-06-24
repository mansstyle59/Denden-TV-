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

  if (n.includes('général') || n.includes('tnt') || n.includes('national') || n.includes('general')) return 'Généralistes';
  if (n.includes('ciné') || n.includes('film') || n.includes('cinema') || n.includes('movie') || n.includes('drama') || n.includes('comedy') || n.includes('comédie') || n.includes('horror') || n.includes('action') || n.includes('thriller') || n.includes('crime') || n.includes('mystery')) return 'Cinéma & Séries';
  if (n.includes('série') || n.includes('series') || n.includes('vod') || n.includes('binge')) return 'Cinéma & Séries';
  if (n.includes('sport') || n.includes('auto') || n.includes('motor')) return 'Sports';
  if (n.includes('jeunesse') || n.includes('kid') || n.includes('enfant') || n.includes('anime') || n.includes('dessin') || n.includes('family') || n.includes('animation')) return 'Jeunesse';
  if (n.includes('info') || n.includes('news') || n.includes('actualité') || n.includes('weather') || n.includes('business') || n.includes('legislative')) return 'Information';
  if (n.includes('doc') || n.includes('découverte') || n.includes('animaux') || n.includes('histoire') || n.includes('science') || n.includes('nature') || n.includes('voyage')) return 'Documentaires';
  if (n.includes('musique') || n.includes('music')) return 'Musique';
  if (n.includes('divertissement') || n.includes('entertainment') || n.includes('show') || n.includes('lifestyle') || n.includes('réalité') || n.includes('reality') || n.includes('eats') || n.includes('relax') || n.includes('pop culture') || n.includes('game') || n.includes('competition')) return 'Divertissement';
  if (n.includes('adulte') || n.includes('xxx') || n.includes('18+')) return 'Adulte';
  if (n.includes('régional') || n.includes('region') || n.includes('local')) return 'Régional';
  if (n.includes('culture') || n.includes('art') || n.includes('religious')) return 'Culture';
  
  if (n.includes('france') || n.includes('français') || n.includes('suisse') || n.includes('belge')) return 'Généralistes';
  
  // Attempt to capitalize properly if it doesn't match standard
  if (clean.length > 2) {
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }
  return 'Généralistes';
}
