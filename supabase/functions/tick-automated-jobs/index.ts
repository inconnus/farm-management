import { createClient } from 'npm:@supabase/supabase-js@2';
import * as turf from 'npm:@turf/turf@7';

const DEFAULT_SIMULATION_SPEED_FACTOR = 1;

type WorkPath = [number, number][];

function parseWorkPath(value: unknown): WorkPath {
  if (!Array.isArray(value)) return [];
  const path: WorkPath = [];
  for (const point of value) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const lng = Number(point[0]);
    const lat = Number(point[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) path.push([lng, lat]);
  }
  return path;
}

function measurePathLengthKm(path: WorkPath): number {
  if (path.length < 2) return 0.001;
  return Math.max(
    turf.length(turf.lineString(path), { units: 'kilometers' }),
    0.001,
  );
}

function computeProgress(
  startedAt: string,
  speedKmh: number,
  pathLengthKm: number,
  factor: number,
): number {
  const elapsedH = (Date.now() - new Date(startedAt).getTime()) / 3_600_000;
  return Math.min(1, (elapsedH * speedKmh * factor) / pathLengthKm);
}

/** Manual/cron invoke — logic เดียวกับ SQL tick_automated_jobs (สำหรับ telemetry ในอนาคต) */
async function tickWorkingJobs(supabase: ReturnType<typeof createClient>) {
  const { data: jobs, error } = await supabase
    .from('automated_jobs')
    .select(
      'id, device_id, work_path, speed_kmh, path_length_km, simulation_speed_factor, started_at, status',
    )
    .eq('status', 'working')
    .not('started_at', 'is', null);

  if (error) throw error;

  let updated = 0;

  for (const job of jobs ?? []) {
    const path = parseWorkPath(job.work_path);
    if (path.length < 2 || !job.started_at) continue;

    const pathLengthKm = job.path_length_km ?? measurePathLengthKm(path);
    const factor =
      job.simulation_speed_factor ?? DEFAULT_SIMULATION_SPEED_FACTOR;
    const speedKmh = job.speed_kmh ?? 4.2;
    const progress = computeProgress(
      job.started_at,
      speedKmh,
      pathLengthKm,
      factor,
    );

    const line = turf.lineString(path);
    const point = turf.along(line, pathLengthKm * Math.min(progress, 1), {
      units: 'kilometers',
    });
    const [lng, lat] = point.geometry.coordinates;

    if (progress >= 1) {
      const { error: jobError } = await supabase
        .from('automated_jobs')
        .update({
          path_progress: 1,
          path_length_km: pathLengthKm,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      if (jobError) throw jobError;
    } else {
      const { error: jobError } = await supabase
        .from('automated_jobs')
        .update({ path_progress: progress, path_length_km: pathLengthKm })
        .eq('id', job.id);
      if (jobError) throw jobError;
    }

    const { error: deviceError } = await supabase
      .from('farm_devices')
      .update({ lat, lng })
      .eq('id', job.device_id);
    if (deviceError) throw deviceError;

    updated += 1;
  }

  return updated;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url = new URL(req.url);

    // อนาคต: POST GPS จริงจากรถ — { device_id, lat, lng, heading?, job_id? }
    if (req.method === 'POST' && url.pathname.endsWith('/telemetry')) {
      const body = await req.json();
      const { device_id, lat, lng, job_id } = body as {
        device_id?: string;
        lat?: number;
        lng?: number;
        job_id?: string;
      };

      if (!device_id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return new Response(
          JSON.stringify({ error: 'device_id, lat, lng required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      await supabase
        .from('farm_devices')
        .update({ lat, lng })
        .eq('id', device_id);

      if (job_id) {
        const { data: job } = await supabase
          .from('automated_jobs')
          .select('id, work_path, path_length_km')
          .eq('id', job_id)
          .maybeSingle();

        if (job?.work_path) {
          const path = parseWorkPath(job.work_path);
          if (path.length >= 2) {
            const line = turf.lineString(path);
            const snapped = turf.nearestPointOnLine(
              line,
              turf.point([lng!, lat!]),
            );
            const pathLengthKm =
              job.path_length_km ?? measurePathLengthKm(path);
            const progress = Math.min(
              1,
              turf.length(
                turf.lineSlice(line, turf.point(path[0]), snapped, {
                  units: 'kilometers',
                }),
                { units: 'kilometers' },
              ) / pathLengthKm,
            );

            await supabase
              .from('automated_jobs')
              .update({
                path_progress: progress,
                status: progress >= 1 ? 'completed' : 'working',
                completed_at: progress >= 1 ? new Date().toISOString() : null,
              })
              .eq('id', job_id);
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, mode: 'telemetry' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updated = await tickWorkingJobs(supabase);
    return new Response(JSON.stringify({ ok: true, updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
