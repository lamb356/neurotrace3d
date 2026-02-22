"use client";

interface ViewerContainerProps {
  canvas: React.ReactNode;
  panels?: React.ReactNode;
}

export default function ViewerContainer({ canvas, panels }: ViewerContainerProps) {
  return (
    <div className="flex h-screen w-full">
      <div className="relative flex-1">{canvas}</div>
      {panels && (
        <aside className="border-border bg-surface flex w-80 flex-col gap-4 overflow-y-auto border-l p-4">
          {panels}
        </aside>
      )}
    </div>
  );
}
