import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export default function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: "neutral" });

      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      try {
        const result = await mermaid.render(id, chart);
        if (!cancelled) setSvg(result.svg);
      } catch (err) {
        console.error("Mermaid render error:", err);
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  // Remove hard-coded width/height from the SVG so it scales to its container
  const scalableSvg = svg
    .replace(/width="[^"]*"/, 'width="100%"')
    .replace(/height="[^"]*"/, 'height="auto"');

  return (
    <>
      {/* Inline diagram */}
      <div
        className={`group relative cursor-zoom-in ${className ?? ""}`}
        onClick={() => setOpen(true)}
        title="Click to enlarge"
      >
        <div
          ref={ref}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: scalableSvg }}
          className="w-full"
        />
        {/* Hover hint */}
        {svg && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none select-none">
            Click to enlarge
          </div>
        )}
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          {/* Modal panel — stop clicks propagating so only backdrop closes */}
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-[95vw] max-h-[90vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-900 text-2xl leading-none font-bold"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: scalableSvg }}
              className="min-w-[60vw]"
            />
          </div>
        </div>
      )}
    </>
  );
}
