
export interface Geotag {
  lat: number;
  lng: number;
}

export interface Photo {
  id: string;
  path: string;
  name: string;
  dataUrl: string;
  geotag: Geotag | null;
  error?: string; // Add optional error field
}
