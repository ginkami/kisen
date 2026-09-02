import React from 'react';
import { useTableScroll } from './TableScrollProvider';

interface StickyCellProps {
  children?: React.ReactNode;
  className?: string;
  as?: 'th' | 'td';
  /** 
   * Tailwind offset class (for example: 'left-0', 'left-[120px]', 'left-[240px]')
   * Default: 'left-0' (for the first column)
   */
  left?: number;
  width?: number;
  showShadow?: boolean;
  rowSpan?: number
  colSpan?: number;
}

export function StickyTableCell({ 
  children, 
  className = '', 
  as = 'td', 
  left = 0,
  width = 0, 
  showShadow = false,
  rowSpan = 1,
  colSpan = 1, 
}: StickyCellProps) {
  const canScroll = useTableScroll();

  const baseStickyClass = `sticky z-30`;

  const shadowClass = showShadow
    ? `after:absolute after:top-0 after:right-0 after:bottom-0 after:w-4 
       after:translate-x-full after:pointer-events-none after:transition-opacity after:duration-300
       ${canScroll ? 'after:opacity-100 after:shadow-[inset_10px_0_8px_-8px_rgba(0,0,0,0.15)]' : 'after:opacity-0'}`
    : '';

  const Component = as;

  return (
    <Component 
      className={`${baseStickyClass} ${shadowClass} ${className}`} 
      rowSpan={rowSpan > 1 ? rowSpan : undefined} 
      colSpan={colSpan > 1 ? colSpan : undefined}
      style={{ left: left, minWidth: width > 0 ? width : 'auto' }}
    >
      {children}
    </Component>
  );
}
