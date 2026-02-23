"use client";

interface ViewerContainerProps {
  toolbar?: React.ReactNode;
  canvas: React.ReactNode;
  panels?: React.ReactNode;
  statusBar?: React.ReactNode;
}

export default function ViewerContainer({ toolbar, canvas, panels, statusBar }: ViewerContainerProps) {
  return (
    <div className="flex h-screen w-full">
      {/* Vertical toolbar (left rail) */}
      {toolbar}
      {/* Main area: canvas + status bar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex-1">{canvas}</div>
          {panels && (
            <aside className="border-border bg-surface flex w-80 flex-col gap-4 overflow-y-auto border-l p-4">
              {panels}
            </aside>
          )}
        </div>
        {/* Status bar (bottom) */}
        {statusBar}
      </div>
    </div>
  );
}
