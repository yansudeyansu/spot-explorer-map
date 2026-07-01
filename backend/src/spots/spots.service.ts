import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spot } from './spot.entity';
import { SearchSpotsDto } from './dto/search-spots.dto';

@Injectable()
export class SpotsService {
  constructor(
    @InjectRepository(Spot)
    private readonly spotsRepo: Repository<Spot>,
  ) {}

  async findAll(query: SearchSpotsDto): Promise<any[]> {
    const { lat, lng, radius } = query;

    // lat/lng/radius が揃っていれば半径検索、無ければ全件返却。
    if (lat !== undefined && lng !== undefined && radius !== undefined) {
      // 距離計算は Haversine 式（球面三角法）を素の SQL で実装している。
      // PostGIS の ST_DWithin でも書けるが、あえて使わない理由:
      //   - データ約200件と小規模で、全件走査でも体感差が無い
      //   - PostGIS 拡張の無いマネージドDB（Supabase 無料枠など）へもそのまま載せられる
      // $1=中心緯度, $2=中心経度, $3=半径km。プレースホルダで SQL インジェクションを防ぐ。
      const sql = `
        SELECT
          id, name, category, lat::float AS lat, lng::float AS lng, address,
          ROUND((
            -- 6371 = 地球半径(km)。LEAST(1.0, ...) は重要な保険:
            -- 浮動小数の丸め誤差で acos() の引数が 1.0 をわずかに超えると NaN になり、
            -- 中心とほぼ同一地点のスポットで距離が壊れる。1.0 で頭打ちにして防ぐ。
            6371 * acos(
              LEAST(1.0,
                cos(radians($1::float)) * cos(radians(lat::float))
                * cos(radians(lng::float) - radians($2::float))
                + sin(radians($1::float)) * sin(radians(lat::float))
              )
            )
          )::numeric, 2) AS distance_km
        FROM spots
        WHERE (
          6371 * acos(
            LEAST(1.0,
              cos(radians($1::float)) * cos(radians(lat::float))
              * cos(radians(lng::float) - radians($2::float))
              + sin(radians($1::float)) * sin(radians(lat::float))
            )
          )
        ) <= $3
        ORDER BY distance_km ASC
      `;
      return this.spotsRepo.query(sql, [lat, lng, radius]);
    }

    // 検索条件が無い場合（初回表示など）は全件を ID 順で返す。
    const spots = await this.spotsRepo.find({ order: { id: 'ASC' } });
    return spots;
  }
}
