import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spot } from '../spots/spot.entity';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// OnApplicationBootstrap は「全モジュール初期化後（=DB接続確立後）」に呼ばれるため、
// 起動時の自動シードに最適なタイミング。docker-compose up だけで初期データが入る。
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Spot)
    private readonly spotsRepo: Repository<Spot>,
  ) {}

  async onApplicationBootstrap() {
    // 冪等性の確保: 既にデータがあれば何もしない。
    // これにより再起動やクラウドの再デプロイで重複投入が起きない。
    const count = await this.spotsRepo.count();
    if (count > 0) {
      this.logger.log(`DB already has ${count} spots — skipping seed.`);
      return;
    }
    await this.seed();
  }

  private async seed() {
    // CSV は Docker イメージにこのパスへ焼き込んでいる（Dockerfile の COPY seed）。
    // volume mount に依存しないため、ローカルでもクラウドでも同じように読める。
    const csvPath = path.join('/app/seed', 'landit_coding_test_seed.csv');
    if (!fs.existsSync(csvPath)) {
      this.logger.warn(`Seed file not found at ${csvPath}`);
      return;
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    // 件数を決め打ちせず CSV の全行を取り込む。件数が変わっても修正不要。
    const records: any[] = parse(content, {
      columns: true,        // 1行目をヘッダーとして列名でアクセス
      skip_empty_lines: true,
      trim: true,
    });

    const spots = records.map((r) => ({
      name: r.name,
      category: r.category || null,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.long), // CSV の列名は "long"。エンティティ側の lng へ詰め替える。
      address: r.address || null,
    }));

    await this.spotsRepo.save(spots);
    this.logger.log(`Seeded ${spots.length} spots.`);
  }
}
