import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface LayoutProps extends HTMLAttributes<HTMLDivElement> {
  absolute?: boolean;
}

export const Row = forwardRef<HTMLDivElement, LayoutProps>(
  ({ absolute, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-row ${absolute ? 'absolute top-0 left-0 z-1' : ''} ${className}`}
      {...props}
    />
  ),
);

export const Column = forwardRef<HTMLDivElement, LayoutProps>(
  ({ absolute, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col ${absolute ? 'absolute top-0 left-0 z-1' : ''} ${className}`}
      {...props}
    />
  ),
);

export const Spacer = forwardRef<HTMLDivElement, LayoutProps>(
  ({ absolute, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex-1 ${absolute ? 'absolute top-0 left-0 z-1' : ''} ${className}`}
      {...props}
    />
  ),
);

export const Padding = forwardRef<HTMLDivElement, LayoutProps>(
  ({ absolute, className = '', ...props }, ref) => (
    <div ref={ref} className={twMerge(`p-3 ${className}`)} {...props} />
  ),
);

export const Divider = forwardRef<HTMLDivElement, LayoutProps>(
  ({ absolute, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`w-full h-[0.5px] bg-[#494949] ${absolute ? 'absolute top-0 left-0 z-1' : ''} ${className}`}
      {...props}
    />
  ),
);

export const MainLayout = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-row h-full w-full m-0 p-0 overflow-hidden ${className}`}
    {...props}
  />
));
MainLayout.displayName = 'MainLayout';
