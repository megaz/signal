"use client";

import type { CreativeBrief } from "@/types/brief";

interface Props {
  brief: CreativeBrief;
}

export function BriefSummary({ brief }: Props) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Creative Brief</p>
        <h2 className="text-lg font-semibold text-gray-100">{brief.title}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Hook type" value={brief.hook_type} />
        <Field label="Format" value={brief.format_length} />
        <Field label="Pacing" value={brief.visual_pacing} className="col-span-2" />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">Creative direction</p>
        <p className="text-sm text-gray-300 leading-relaxed">{brief.creative_direction}</p>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">Performance rationale</p>
        <p className="text-sm text-orange-300/90 leading-relaxed">{brief.performance_rationale}</p>
      </div>

      {brief.concepts.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Variant concepts</p>
          <ul className="space-y-2">
            {brief.concepts.map((c) => (
              <li key={c.label} className="text-xs text-gray-400 border-l-2 border-orange-500 pl-3">
                <span className="text-gray-200 font-medium">{c.label}</span>
                <span className="text-gray-500"> · {c.hook_type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-gray-200">{value}</p>
    </div>
  );
}
