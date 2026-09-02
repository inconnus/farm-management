import type { KasetkornAuthContext } from '@features/dashboard/data/api';
import { defaultKasetkornAuth } from '@features/dashboard/data/api';
import type { AuthMode } from '../store';
import type { PluksangSession } from './pluksangStore';

export function getKasetkornAuthContext(
  authMode: AuthMode | null,
  pluksangSession: PluksangSession | null,
): KasetkornAuthContext {
  if (authMode === 'pluksang' && pluksangSession) {
    return {
      scope: 'farmer',
      token: pluksangSession.token,
      appFarmerId: pluksangSession.appFarmerId,
    };
  }
  return defaultKasetkornAuth;
}
