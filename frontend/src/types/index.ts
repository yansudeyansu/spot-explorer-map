export interface Spot {
  id: number;
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  address: string | null;
  distance_km?: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}
