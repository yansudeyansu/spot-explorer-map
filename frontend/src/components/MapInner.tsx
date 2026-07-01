'use client';
import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spot, LatLng } from '@/types';
import { getCategoryColor } from './SpotList';

// ---- Marker icon factory ----
function createDivIcon(color: string, selected: boolean, label: string) {
  const size = selected ? 20 : 13;
  const ring = selected
    ? `box-shadow:0 0 0 4px ${color}33, 0 2px 6px rgba(0,0,0,.3);`
    : `box-shadow:0 1px 3px rgba(0,0,0,.35);`;
  return L.divIcon({
    html: `<div role="img" aria-label="${label}" style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2.5px solid #fff;
      border-radius:50%;
      ${ring}
    "></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

// 地図の移動完了(moveend)時にだけ中心座標を親へ通知する。
// move（移動中の連続イベント）ではなく moveend にすることで、
// 検索・住所取得のトリガーをドラッグ終了後の1回に絞っている。
function MapEvents({ onMoveEnd }: { onMoveEnd: (c: LatLng) => void }) {
  useMapEvents({
    moveend(e) {
      const { lat, lng } = e.target.getCenter();
      onMoveEnd({ lat, lng });
    },
  });
  return null;
}

// 一覧でスポットが選択されたら、その位置へ地図をパンする。
// prevId ガードが無いと panTo→moveend→再レンダリングのループで毎回パンし続けるため、
// 「選択IDが実際に変わった時だけ」動かすようにしている。
function MapController({ spot }: { spot: Spot | undefined }) {
  const map = useMap();
  const prevId = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (spot && spot.id !== prevId.current) {
      prevId.current = spot.id;
      map.panTo([spot.lat, spot.lng], { animate: true });
    }
  }, [spot, map]);
  return null;
}

// 中心を初期位置（東京）へ戻すボタン。
// 地図を遠くまで動かして迷子になった時の復帰手段（フールプルーフ）。
function RecenterControl({ home }: { home: LatLng }) {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => map.setView([home.lat, home.lng], 11, { animate: true })}
      className="absolute left-3 bottom-8 z-[500] bg-white border border-zinc-200 rounded-lg
                 shadow-sm px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      aria-label="地図の中心を初期位置（東京）に戻す"
    >
      ⌖ 中心を戻す
    </button>
  );
}

// ---- Main component ----
interface Props {
  center: LatLng;
  home: LatLng;
  spots: Spot[];
  radius: number;
  selectedSpotId: number | null;
  onCenterChange: (c: LatLng) => void;
  onSpotSelect: (id: number | null) => void;
}

export default function MapInner({
  center,
  home,
  spots,
  radius,
  selectedSpotId,
  onCenterChange,
  onSpotSelect,
}: Props) {
  const selectedSpot = spots.find((s) => s.id === selectedSpotId);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={11}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Radius circle */}
      <Circle
        center={[center.lat, center.lng]}
        radius={radius * 1000}
        pathOptions={{
          color: '#18181b',
          fillColor: '#18181b',
          fillOpacity: 0.04,
          weight: 1.5,
          dashArray: '4, 6',
        }}
      />

      {/* Spot markers */}
      {spots.map((spot) => {
        const color = getCategoryColor(spot.category);
        const isSelected = spot.id === selectedSpotId;
        return (
          <Marker
            key={spot.id}
            position={[spot.lat, spot.lng]}
            icon={createDivIcon(color, isSelected, `${spot.name}（${spot.category ?? ''}）`)}
            zIndexOffset={isSelected ? 1000 : 0}
            keyboard
            eventHandlers={{
              click() {
                onSpotSelect(isSelected ? null : spot.id);
              },
            }}
          >
            <Popup>
              <div className="text-sm min-w-[180px]">
                <p className="font-semibold text-zinc-900">{spot.name}</p>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                  {spot.category && (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {spot.category}
                    </span>
                  )}
                </div>
                {spot.address && (
                  <p className="mt-1 text-xs text-zinc-400">{spot.address}</p>
                )}
                {spot.distance_km !== undefined && (
                  <p className="mt-1.5 text-xs font-medium text-zinc-900 tabular-nums">
                    中心から {spot.distance_km} km
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      <MapEvents onMoveEnd={onCenterChange} />
      <MapController spot={selectedSpot} />
      <RecenterControl home={home} />
    </MapContainer>
  );
}
