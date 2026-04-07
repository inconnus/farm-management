import type { LandData } from '@shared/types/lands';
import type { DbFarmWithLands, DbLandInFarm, DbLand } from './api';

export type { LandData as Land };

export type Farm = {
  id: string;
  name: string;
  province: string;
  plotCount: number;
  image: string;
  lands: LandData[];
};

export function toLandData(
  land: DbLandInFarm | DbLand,
  province = '',
): LandData {
  type GeoPolygon = { type: string; coordinates: [number, number][][] };
  const geom = land.geometry_json as GeoPolygon | null;
  const coords = geom?.coordinates?.[0] ?? [];

  return {
    id: land.id,
    farmId: 'farm_id' in land ? (land.farm_id ?? undefined) : undefined,
    name: land.name,
    type: land.crop_type ?? '',
    location: province,
    image: land.image_url ?? '',
    color: land.color ?? '#888888',
    coords: coords as [number, number][],
  };
}

export function toFarm(db: DbFarmWithLands): Farm {
  const province = db.province ?? '';
  return {
    id: db.id,
    name: db.name,
    province,
    plotCount: db.lands.length,
    image: db.image_url ?? '',
    lands: db.lands.map((l) => toLandData(l, province)),
  };
}
