import mqtt, { type MqttClient } from 'mqtt';
import { useEffect, useState } from 'react';

export type WaterLevelMqttConfig = {
  url: string;
  topic: string;
  username?: string;
  password?: string;
};

export type WaterLevelMqttState = {
  value: number | null;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  updatedAt: number | null;
  error: string | null;
};

const IDLE_STATE: WaterLevelMqttState = {
  value: null,
  status: 'idle',
  updatedAt: null,
  error: null,
};

type Entry = {
  client: MqttClient | null;
  refs: number;
  state: WaterLevelMqttState;
  listeners: Set<() => void>;
};

const entries = new Map<string, Entry>();

function entryKey(config: WaterLevelMqttConfig): string {
  return `${config.url}::${config.topic}`;
}

function parseFloatPayload(payload: Buffer | string): number | null {
  const text =
    typeof payload === 'string'
      ? payload.trim()
      : payload.toString('utf8').trim();
  if (!text) return null;

  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;

  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      for (const key of ['value', 'level', 'water_level', 'cm', 'data']) {
        const v = obj[key];
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string') {
          const n = Number(v.trim());
          if (Number.isFinite(n)) return n;
        }
      }
    }
  } catch {
    // not JSON
  }

  return null;
}

function notify(entry: Entry) {
  for (const listener of entry.listeners) listener();
}

function setEntryState(entry: Entry, patch: Partial<WaterLevelMqttState>) {
  entry.state = { ...entry.state, ...patch };
  notify(entry);
}

function ensureConnected(config: WaterLevelMqttConfig): Entry {
  const key = entryKey(config);
  let entry = entries.get(key);
  if (entry) return entry;

  entry = {
    client: null,
    refs: 0,
    state: { ...IDLE_STATE, status: 'connecting' },
    listeners: new Set(),
  };
  entries.set(key, entry);

  const client = mqtt.connect(config.url, {
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 15_000,
    username: config.username || undefined,
    password: config.password || undefined,
  });

  entry.client = client;

  client.on('connect', () => {
    setEntryState(entry!, { status: 'connected', error: null });
    client.subscribe(config.topic, { qos: 0 }, (err) => {
      if (err) {
        setEntryState(entry!, {
          status: 'error',
          error: err.message || 'subscribe failed',
        });
      }
    });
  });

  client.on('reconnect', () => {
    setEntryState(entry!, { status: 'connecting' });
  });

  client.on('close', () => {
    if (entry!.refs > 0) {
      setEntryState(entry!, { status: 'connecting' });
    }
  });

  client.on('error', (err) => {
    setEntryState(entry!, {
      status: 'error',
      error: err.message || 'mqtt error',
    });
  });

  client.on('message', (topic, payload) => {
    if (topic !== config.topic) return;
    const value = parseFloatPayload(payload);
    if (value === null) return;
    setEntryState(entry!, {
      value,
      updatedAt: Date.now(),
      status: 'connected',
      error: null,
    });
  });

  return entry;
}

function retain(config: WaterLevelMqttConfig) {
  const entry = ensureConnected(config);
  entry.refs += 1;
  return entry;
}

function release(config: WaterLevelMqttConfig) {
  const key = entryKey(config);
  const entry = entries.get(key);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    entry.client?.end(true);
    entries.delete(key);
  }
}

/** Subscribe to a water-level MQTT topic (shared connection per url+topic). */
export function useWaterLevelMqtt(
  config: WaterLevelMqttConfig | null | undefined,
): WaterLevelMqttState {
  const [state, setState] = useState<WaterLevelMqttState>(IDLE_STATE);

  useEffect(() => {
    if (!config?.url || !config?.topic) {
      setState(IDLE_STATE);
      return;
    }

    const entry = retain(config);
    setState(entry.state);

    const onChange = () => setState({ ...entry.state });
    entry.listeners.add(onChange);

    return () => {
      entry.listeners.delete(onChange);
      release(config);
    };
  }, [config?.url, config?.topic, config?.username, config?.password]);

  return state;
}

export function buildEmqxWsUrl(host: string, port = 8084): string {
  const cleaned = host.replace(/\/$/, '');
  if (cleaned.includes('://')) {
    try {
      const u = new URL(cleaned);
      if (!u.port) u.port = String(port);
      if (!u.pathname || u.pathname === '/') u.pathname = '/mqtt';
      return u.toString().replace(/\/$/, '');
    } catch {
      // fall through
    }
  }
  return `wss://${cleaned}:${port}/mqtt`;
}
