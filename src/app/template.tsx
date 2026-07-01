// A template (unlike a layout) creates a fresh instance and re-mounts its
// children on every navigation. That re-mount lets each route — landing /
// create / play — fade in via `pageFadeIn`, so switching routes reads as a
// smooth crossfade instead of a hard swap.
export default function Template({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex-1 flex flex-col min-h-0 animate-[pageFadeIn_0.32s_ease-out_both]">
      {children}
    </div>
  );
}
