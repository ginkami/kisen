import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const TableScrollContext = createContext<boolean>(false);

interface TableScrollProviderProps {
  children: React.ReactNode;
}

export function TableScrollProvider({ children }: TableScrollProviderProps) {
  const [canScroll, setCanScroll] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkScroll = (): void => {
      const hasOverflow = container.scrollWidth > container.clientWidth;
      setCanScroll(hasOverflow);
    };

    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });

    resizeObserver.observe(container);
    checkScroll();

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <TableScrollContext.Provider value={canScroll}>
      <div ref={containerRef} className="table-container w-[calc(100vw-32px)] md:w-auto overflow-x-auto overflow-y-hidden">
        {children}
      </div>
    </TableScrollContext.Provider>
  );
}

// A custom hook for use inside table cells.
export function useTableScroll() {
  return useContext(TableScrollContext);
}
