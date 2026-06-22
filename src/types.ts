/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string;
  category: string;
  isEnabled: boolean;
  country?: string;
  language?: string;
  description?: string;
  tags?: string[];
  channelNumber?: number;
  backupUrls?: string[];
  group?: string; // For merged channels
  status?: 'online' | 'slow' | 'offline';
  lastCheck?: string;
  epgId?: string;
  responseTime?: number;
  format?: string;
  quality?: 'HD' | 'SD' | '4K' | 'Hors Service';
  resolution?: string;
  isVOD?: boolean; // For movies and replays
  codecVideo?: string;
  codecAudio?: string;
  bitrate?: string;
  latency?: string;
  server?: string;
  viewCount?: number;
  lastPlayed?: string;
  isPrivate?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
}

export interface EPGSource {
  url: string;
  name: string;
  lastSync?: string;
  isActive: boolean;
}

export interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  description?: string;
  category?: string;
}

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  year: string;
  duration: string;
  genres: string[];
  country: string;
  language: string;
  director: string;
  actors: string[];
  summary: string;
  poster: string;
  banner?: string;
  trailerUrl?: string;
  videoUrl: string;
  ratingUser?: number;
  ratingImdb?: number;
  quality: 'HD' | 'SD' | '4K' | 'UHD';
  imdbId?: string;
  category?: string; // 'popular' | 'new' | 'trend' | 'top'
  isNew?: boolean;
  isPopular?: boolean;
  viewCount?: number;
}

export interface AppSettings {
  language: string;
  videoQuality: 'auto' | 'low' | 'medium' | 'high';
  parentalLock: boolean;
  pin: string;
  theme?: 'dark' | 'light';
}

export interface AppState {
  channels: Channel[];
  settings: AppSettings;
  epgSources: EPGSource[];
}

export type SocketEvent = 
  | { type: 'CHANNEL_ADDED'; payload: Channel }
  | { type: 'CHANNEL_UPDATED'; payload: Channel }
  | { type: 'CHANNEL_DELETED'; payload: string }
  | { type: 'CHANNELS_SYNC'; payload: Channel[] }
  | { type: 'SETTINGS_UPDATED'; payload: AppSettings };
