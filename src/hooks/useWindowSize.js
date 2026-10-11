import { useState, useEffect } from "react";

// Restituisce { width, height } aggiornati al resize con debounce leggero.
// Breakpoint desktop: sm <1400  md 1400-1679  lg 1680-1919  xl >=1920
export function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    let raf;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setSize({ width: window.innerWidth, height: window.innerHeight })
      );
    };
    window.addEventListener("resize", handler);
    return () => { window.removeEventListener("resize", handler); cancelAnimationFrame(raf); };
  }, []);
  return size;
}

// Helper: ritorna il nome del breakpoint corrente.
export function useBreakpoint() {
  const { width } = useWindowSize();
  if (width < 1400) return "sm";   // laptop 1280-1399
  if (width < 1680) return "md";   // 1400-1679
  if (width < 1920) return "lg";   // 1680-1919
  return "xl";                     // 1920+
}
