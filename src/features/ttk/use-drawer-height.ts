import { useEffect, useState } from 'react';

/** Высота нижнего drawer ТТК: 90% окна + 40px, как в макете. */
export function useDrawerHeight() {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 760 : Math.round(window.innerHeight * 0.9) + 40
  );

  useEffect(() => {
    const update = () => setHeight(Math.round(window.innerHeight * 0.9) + 40);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return height;
}
