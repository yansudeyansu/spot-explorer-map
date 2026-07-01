import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

// node-postgres は NUMERIC/DECIMAL 型を「文字列」で返す（大きな桁でも精度を落とさないため）。
// 変換しないと lat/lng が string のままとなり、距離計算や JSON が壊れる。
// from() で取得時に number へ戻している。
const numericTransformer = {
  to: (v: number) => v,
  from: (v: string) => (v == null ? null : parseFloat(v)),
};

@Entity('spots')
export class Spot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column('numeric', { precision: 10, scale: 6, transformer: numericTransformer })
  lat: number;

  @Column('numeric', { precision: 10, scale: 6, transformer: numericTransformer })
  lng: number;

  @Column({ nullable: true })
  address: string;
}
