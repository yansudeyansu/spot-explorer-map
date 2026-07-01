import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Spot } from '../spots/spot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Spot])],
  providers: [SeedService],
})
export class SeedModule {}
