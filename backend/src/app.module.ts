import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SpotsModule } from './spots/spots.module';
import { SeedModule } from './seed/seed.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { Spot } from './spots/spot.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        // synchronize:true はエンティティ定義からスキーマを自動生成する。
        // 開発・本課題の規模では手軽だが、本番ではマイグレーション運用に切り替える前提。
        const base = { type: 'postgres' as const, entities: [Spot], synchronize: true };

        // 接続情報は2系統に対応:
        //  - DATABASE_URL（1本のURL）   … Supabase / Render などクラウド標準
        //  - ホスト等の個別変数          … ローカル docker-compose
        // クラウドDBは TLS 必須かつ証明書が自己署名のことが多いため rejectUnauthorized:false。
        if (url) {
          return { ...base, url, ssl: { rejectUnauthorized: false } } as any;
        }

        return {
          ...base,
          host: config.get<string>('DATABASE_HOST') ?? 'localhost',
          port: Number(config.get<string>('DATABASE_PORT') ?? '5432'),
          username: config.get<string>('DATABASE_USER') ?? 'postgres',
          password: config.get<string>('DATABASE_PASSWORD') ?? 'postgres',
          database: config.get<string>('DATABASE_NAME') ?? 'landit',
        } as any;
      },
      inject: [ConfigService],
    }),
    SpotsModule,
    SeedModule,
    GeocodingModule,
  ],
})
export class AppModule {}
