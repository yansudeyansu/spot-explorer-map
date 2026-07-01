import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  address: string;
  expires: number;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10分
  // 座標を小数3桁（≒100m四方）に丸めてキャッシュキーにする。
  // 地図の微小な移動は同じキーに集約され、外部APIの呼び出し回数・課金・レート制限を抑える。
  private readonly CACHE_PRECISION = 3;

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const key = `${lat.toFixed(this.CACHE_PRECISION)},${lng.toFixed(this.CACHE_PRECISION)}`;

    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.address;
    }

    const address = await this.fetchAddress(lat, lng);
    this.cache.set(key, { address, expires: Date.now() + this.CACHE_TTL });
    return address;
  }

  // APIキーがあれば高精度な Google、無ければキー不要・無料の Nominatim を使う。
  // これにより「キー未設定でもアプリがそのまま動く」状態を担保している。
  private async fetchAddress(lat: number, lng: number): Promise<string> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      return this.googleGeocode(lat, lng, apiKey);
    }
    return this.nominatimGeocode(lat, lng);
  }

  private async googleGeocode(lat: number, lng: number, apiKey: string): Promise<string> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=ja`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    // Google が失敗（キー無効・枠超過など）しても画面を空にしないよう Nominatim へ退避。
    this.logger.warn(`Google geocoding failed: ${data.status}`);
    return this.nominatimGeocode(lat, lng);
  }

  private async nominatimGeocode(lat: number, lng: number): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`;
    const res = await fetch(url, {
      // Nominatim の利用規約で User-Agent の明示が必須。付けないと弾かれることがある。
      headers: { 'User-Agent': 'LanditSpotExplorer/1.0' },
    });
    const data = await res.json();

    if (data.error) {
      return '';
    }

    // Nominatim は住所を要素ごとに分割して返すので、日本の住所表記順
    // （都道府県 → 市区町村 → 町名）に並べて連結する。
    // 取れない要素はスキップし、全滅時のみ display_name（フル住所）にフォールバック。
    const a = data.address || {};
    const parts = [a.state, a.city || a.county, a.suburb || a.neighbourhood].filter(Boolean);
    return parts.length > 0 ? parts.join('') : (data.display_name || '');
  }
}
