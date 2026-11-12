import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTableZoomOptions {
  minScale?: number;
  maxScale?: number;
  step?: number;
  autoFitWhenOverflow?: boolean;
  /** Optional explicit natural width (e.g., 820 for fixed-width report card) */
  fixedContentWidth?: number;
  /** Key/value that when changed should trigger a re-measure (e.g. modal open or filtered count) */
  measureTrigger?: unknown;
}

export function useTableZoom({
  minScale = 0.3,
  maxScale = 1.5,
  step = 0.1,
  autoFitWhenOverflow = false,
  fixedContentWidth,
  measureTrigger,
}: UseTableZoomOptions = {}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'fit' | 'manual'>('manual');
  const [manualScale, setManualScale] = useState<number>(1);
  const [viewportWidth, setViewportWidth] = useState<number>(0);
  const [contentSize, setContentSize] = useState<{ width: number; height: number }>({
    width: fixedContentWidth ?? 0,
    height: 0,
  });

  const hasAutoFittedRef = useRef(false);

  const clampScale = useCallback(
    (val: number) => Math.min(maxScale, Math.max(minScale, Number(val.toFixed(3)))),
    [maxScale, minScale]
  );

  const measure = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return;

    const vpStyle = window.getComputedStyle(vp);
    const padX =
      (parseFloat(vpStyle.paddingLeft) || 0) + (parseFloat(vpStyle.paddingRight) || 0);
    const availableW = Math.max(0, vp.clientWidth - padX);
    setViewportWidth(availableW);

    const naturalW = fixedContentWidth ?? content.scrollWidth;
    const naturalH = content.scrollHeight;
    setContentSize((prev) =>
      prev.width === naturalW && prev.height === naturalH
        ? prev
        : { width: naturalW, height: naturalH }
    );
  }, [fixedContentWidth]);

  useEffect(() => {
    hasAutoFittedRef.current = false;
  }, [measureTrigger]);

  useEffect(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return;

    measure();
    const rafId = window.requestAnimationFrame(measure);

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(vp);
    observer.observe(content);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [measure, measureTrigger]);

  // Auto-switch to fit-to-screen once when opened on narrow viewports if requested
  useEffect(() => {
    if (!autoFitWhenOverflow || hasAutoFittedRef.current) return;
    if (viewportWidth > 0 && contentSize.width > 0) {
      hasAutoFittedRef.current = true;
      if (contentSize.width > viewportWidth) {
        setMode('fit');
      } else {
        setMode('manual');
        setManualScale(1);
      }
    }
  }, [autoFitWhenOverflow, viewportWidth, contentSize.width]);

  const fitScale =
    viewportWidth > 0 && contentSize.width > 0
      ? clampScale(Math.min(1, (viewportWidth - 2) / contentSize.width))
      : 1;

  const scale = mode === 'fit' ? fitScale : manualScale;
  const isScaled = Math.abs(scale - 1) > 0.005;

  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const zoomIn = useCallback(() => {
    setMode('manual');
    setManualScale((prev) => {
      const base = mode === 'fit' ? scaleRef.current : prev;
      return clampScale(Math.round((base + step) * 20) / 20);
    });
  }, [clampScale, mode, step]);

  const zoomOut = useCallback(() => {
    setMode('manual');
    setManualScale((prev) => {
      const base = mode === 'fit' ? scaleRef.current : prev;
      return clampScale(Math.round((base - step) * 20) / 20);
    });
  }, [clampScale, mode, step]);

  const resetZoom = useCallback(() => {
    setMode('manual');
    setManualScale(1);
  }, []);

  const toggleFit = useCallback(() => {
    setMode((prev) => {
      if (prev === 'fit') {
        setManualScale(1);
        return 'manual';
      }
      return 'fit';
    });
  }, []);

  const setFitMode = useCallback(() => {
    setMode('fit');
  }, []);

  // Two-finger pinch-to-zoom directly on the viewport
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    let pinchStartDist = 0;
    let pinchStartScale = 1;

    const getTouchDist = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist = getTouchDist(e.touches[0], e.touches[1]);
        pinchStartScale = scaleRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist > 0) {
        e.preventDefault();
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const nextScale = clampScale(pinchStartScale * (dist / pinchStartDist));
        setMode('manual');
        setManualScale(nextScale);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDist = 0;
      }
    };

    vp.addEventListener('touchstart', onTouchStart, { passive: true });
    vp.addEventListener('touchmove', onTouchMove, { passive: false });
    vp.addEventListener('touchend', onTouchEnd, { passive: true });
    vp.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      vp.removeEventListener('touchstart', onTouchStart);
      vp.removeEventListener('touchmove', onTouchMove);
      vp.removeEventListener('touchend', onTouchEnd);
      vp.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [clampScale, measureTrigger]);

  const scaledWidth =
    isScaled && contentSize.width > 0 ? Math.floor(contentSize.width * scale) : undefined;
  const scaledHeight =
    isScaled && contentSize.height > 0 ? Math.ceil(contentSize.height * scale) : undefined;

  return {
    viewportRef,
    contentRef,
    mode,
    scale,
    fitScale,
    isScaled,
    percent: Math.round(scale * 100),
    canZoomIn: scale < maxScale - 0.005,
    canZoomOut: scale > minScale + 0.005,
    canFit: viewportWidth > 0 && contentSize.width > viewportWidth + 4,
    contentWidth: contentSize.width,
    scaledWidth,
    scaledHeight,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFit,
    setFitMode,
  };
}
