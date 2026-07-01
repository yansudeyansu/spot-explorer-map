'use client';
import dynamic from 'next/dynamic';
import { Spot, LatLng } from '@/types';

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-100">
      <p className="text-zinc-400 text-sm">地図を読み込み中…</p>
    </div>
  ),
});

interface Props {
  center: LatLng;
  home: LatLng;
  spots: Spot[];
  radius: number;
  selectedSpotId: number | null;
  onCenterChange: (c: LatLng) => void;
  onSpotSelect: (id: number | null) => void;
}

export default function MapView(props: Props) {
  return (
    <div className="w-full h-full">
      <MapInner {...props} />
    </div>
  );
}
