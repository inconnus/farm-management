import { Column } from '@app/layout';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SidebarNavAPI, SidebarNavProps } from './types';

// ─── Animation (iOS-style push/pop) ──────────────────────────────

const IOS_EASE = [0.25, 0.46, 0.45, 0.94] as const;
const DURATION = 0.38;

const pageVariants = {
  initial: (dir: number) => ({
    x: dir > 0 ? '100%' : '-25%',
    opacity: dir > 0 ? 1 : 0,
  }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? '-25%' : '100%',
    opacity: dir > 0 ? 0 : 1,
  }),
};

const pageTransition = { duration: DURATION, ease: IOS_EASE };

// ─── URL helpers ─────────────────────────────────────────────────

function segmentsFromURL(pathname: string, basePath: string): string[] {
  const base = basePath.replace(/\/+$/, '');
  const sub = pathname.startsWith(base)
    ? pathname.slice(base.length)
    : pathname;
  return sub.split('/').filter(Boolean);
}

function buildInitialStack(
  segments: string[],
  pages: SidebarNavProps['pages'],
  rootKey: string,
): string[] {
  if (segments.length === 0) return [rootKey];

  const stack: string[] = [rootKey];
  for (const seg of segments) {
    // Direct match by path
    const direct = pages.find((p) => p.path === seg);
    if (direct) {
      stack.push(direct.key);
      continue;
    }
    // Dynamic param — use the segment value as key (e.g. farmId)
    const dynamic = pages.find((p) => p.path.startsWith(':'));
    if (dynamic) {
      stack.push(seg);
    }
  }
  return stack;
}

// ─── Component ───────────────────────────────────────────────────

export function SidebarNav({
  basePath,
  pages,
  children,
  className,
  onPageChange,
}: SidebarNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const rootKey = pages[0]?.key ?? '';

  // ─── Resolve page from key ───────────────────────────────────
  const resolvePage = useCallback(
    (key: string) => {
      return (
        pages.find((p) => p.key === key) ??
        pages.find((p) => p.path.startsWith(':'))
      );
    },
    [pages],
  );

  // ─── Build initial stack from URL ────────────────────────────
  const [stack, setStack] = useState<string[]>(() => {
    const segs = segmentsFromURL(location.pathname, basePath);
    return buildInitialStack(segs, pages, rootKey);
  });
  const [direction, setDirection] = useState(1);

  const currentKey = stack[stack.length - 1] ?? rootKey;
  const currentPage = resolvePage(currentKey);

  // ─── Navigation API ──────────────────────────────────────────

  const push = useCallback(
    (pageKey: string) => {
      setDirection(1);
      setStack((prev) => [...prev, pageKey]);

      const page = resolvePage(pageKey);
      if (page) {
        const base = basePath.replace(/\/+$/, '');
        // If dynamic path, use the pageKey as URL segment
        const urlSeg = page.path.startsWith(':') ? pageKey : page.path;
        navigate(`${base}/${urlSeg}`);
      }
      onPageChange?.(pageKey, 'push');
    },
    [basePath, navigate, onPageChange, resolvePage],
  );

  const pop = useCallback(() => {
    setDirection(-1);
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const parentKey = next[next.length - 1];
      const parentPage = resolvePage(parentKey);
      if (parentPage) {
        const base = basePath.replace(/\/+$/, '');
        navigate(
          parentPage.path === '' || parentPage.path === '/'
            ? base
            : `${base}/${parentPage.path}`,
        );
      }
      onPageChange?.(parentKey, 'pop');
      return next;
    });
  }, [basePath, navigate, onPageChange, resolvePage]);

  const api: SidebarNavAPI = useMemo(
    () => ({ push, pop, depth: stack.length - 1, currentKey }),
    [push, pop, stack.length, currentKey],
  );

  // ─── Sync browser back/forward ──────────────────────────────

  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname === prevPathRef.current) return;
    prevPathRef.current = location.pathname;

    const segs = segmentsFromURL(location.pathname, basePath);
    const desired = buildInitialStack(segs, pages, rootKey);

    setStack((currentStack) => {
      const desiredKey = desired[desired.length - 1];
      const currentKey = currentStack[currentStack.length - 1];
      const changed =
        desiredKey !== currentKey || desired.length !== currentStack.length;
      if (!changed) return currentStack;
      setDirection(desired.length > currentStack.length ? 1 : -1);
      return desired;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ─── Height animation ────────────────────────────────────────

  const pageRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number>(0);

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    setPanelHeight(el.offsetHeight);
    const ro = new ResizeObserver(() => setPanelHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentKey]);

  // ─── Render ──────────────────────────────────────────────────

  return (
    <>
      <Column
        className={
          className ??
          'pointer-events-auto bg-white/85 backdrop-blur-xl m-3 pt-1 rounded-3xl border border-gray-200 shadow-xl w-[400px] max-h-[calc(100vh-24px)] overflow-hidden absolute right-0'
        }
      >
        <motion.div
          className="relative overflow-hidden"
          animate={{ height: panelHeight || 'auto' }}
          transition={pageTransition}
        >
          <AnimatePresence initial={false} mode="sync" custom={direction}>
            {currentPage && (
              <motion.div
                key={currentKey}
                ref={pageRef}
                custom={direction}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  willChange: 'transform, opacity',
                }}
              >
                {currentPage.render(api)}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Column>
      {children}
    </>
  );
}
