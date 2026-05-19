'use client';

interface ResearchInterestCloudProps {
  areas: string[];
  projectAreas?: string[];
  emptyText?: string;
  onAdd?: () => void;
}

interface WeightedInterest {
  label: string;
  score: number;
}

function normalizeLabel(label: string) {
  return label.trim().replace(/\s+/g, ' ');
}

function buildWeightedInterests(areas: string[], projectAreas: string[] = []): WeightedInterest[] {
  const weighted = new Map<string, WeightedInterest>();

  areas.map(normalizeLabel).filter(Boolean).forEach((area, index) => {
    const key = area.toLowerCase();
    weighted.set(key, {
      label: area,
      score: (weighted.get(key)?.score || 0) + Math.max(1, 3 - index * 0.35),
    });
  });

  projectAreas.map(normalizeLabel).filter(Boolean).forEach((area) => {
    const key = area.toLowerCase();
    weighted.set(key, {
      label: weighted.get(key)?.label || area,
      score: (weighted.get(key)?.score || 0) + 2.25,
    });
  });

  return Array.from(weighted.values()).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

function getInterestStyle(score: number, minScore: number, maxScore: number) {
  const range = Math.max(0.01, maxScore - minScore);
  const intensity = (score - minScore) / range;
  const fontSize = 13 + intensity * 11;
  const fontWeight = Math.round(560 + intensity * 240);
  const borderColor = intensity > 0.66 ? '#8b603b' : intensity > 0.33 ? '#9cc9df' : '#D8E8F2';
  const background = intensity > 0.66 ? '#fff7ea' : intensity > 0.33 ? '#F3FAFD' : '#fffdf9';
  const color = intensity > 0.66 ? '#6f4828' : intensity > 0.33 ? '#17425d' : '#5B5148';

  return {
    background,
    borderColor,
    color,
    fontSize: `${fontSize}px`,
    fontWeight,
    lineHeight: 1.05,
    paddingInline: `${12 + intensity * 7}px`,
    paddingBlock: `${8 + intensity * 3}px`,
  };
}

export function ResearchInterestCloud({
  areas,
  projectAreas = [],
  emptyText = 'No research areas listed.',
  onAdd,
}: ResearchInterestCloudProps) {
  const interests = buildWeightedInterests(areas, projectAreas);
  const scores = interests.map((interest) => interest.score);
  const minScore = Math.min(...scores, 0);
  const maxScore = Math.max(...scores, 1);

  if (!interests.length) {
    return (
      <div className="rounded-[8px] border border-[#eee6dc] bg-[#fffdf9] p-4">
        <p className="text-sm text-[#5B5148]">{emptyText}</p>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 rounded-full border border-[#D8E8F2] bg-[#F3FAFD] px-3 py-1.5 text-xs font-semibold text-[#17425d] transition hover:border-[#17425d]"
          >
            Add research area
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[8px] border border-[#eee6dc] bg-[#fffdf9] p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {interests.map((interest) => (
          <button
            key={interest.label}
            type="button"
            title={`${interest.label} · relative activity ${interest.score.toFixed(1)}`}
            aria-label={`${interest.label}, relative activity ${interest.score.toFixed(1)}`}
            className="rounded-full border shadow-[0_1px_2px_rgba(60,42,27,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(60,42,27,0.08)]"
            style={getInterestStyle(interest.score, minScore, maxScore)}
          >
            {interest.label}
          </button>
        ))}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-full border border-[#D8E8F2] bg-white px-3 py-2 text-xs font-semibold text-[#17425d] transition hover:border-[#17425d]"
          >
            Add
          </button>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eee6dc] pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8178]">
        <span>Relative Activity</span>
        <span className="flex items-center gap-2 normal-case tracking-normal">
          <span className="h-2 w-8 rounded-full bg-[#D8E8F2]" />
          <span className="h-2 w-10 rounded-full bg-[#9cc9df]" />
          <span className="h-2 w-12 rounded-full bg-[#8b603b]" />
        </span>
      </div>
    </div>
  );
}
