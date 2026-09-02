import { useAtomValue } from 'jotai';
import { useParams } from 'react-router-dom';
import { authModeAtom } from '../store';

/** Base path prefix for in-app navigation (`''` for pluksang, `/:orgSlug` for farm mode). */
export function useAppBasePath(): string {
  const authMode = useAtomValue(authModeAtom);
  const { orgSlug } = useParams<{ orgSlug?: string }>();

  if (authMode === 'pluksang') return '';
  return orgSlug ? `/${orgSlug}` : '';
}
