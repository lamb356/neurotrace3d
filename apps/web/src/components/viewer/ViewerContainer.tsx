"use client";

interface ViewerContainerProps {
  toolbar?: React.ReactNode;
  canvas: React.ReactNode;
  panels?: React.ReactNode;
}

export default function ViewerContainer({ toolbar, canvas, panels }: ViewerContainerProps) {
  return (
    <div className="flex h-screen w-full flex-col">
      {toolbar}
      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1">{canvas}</div>
        {panels && (
          <aside className="border-border bg-surface flex w-80 flex-col gap-4 overflow-y-auto border-l p-4">
            {panels}
          </aside>
        )}
      </div>
    </div>
  );
}
