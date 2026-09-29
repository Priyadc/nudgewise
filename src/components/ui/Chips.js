'use client';

/**
 * A row of tappable pill buttons — one is selected at a time.
 *   options: [{ value, label, icon?: LucideIcon, color?, title? }]
 */
export function ChipGroup({ options, value, onChange, disabled, ariaLabel }) {
  return (
    <div className="chip-row" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            className="pick-chip"
            aria-pressed={active}
            disabled={disabled}
            title={o.title}
            onClick={() => onChange(o.value)}
            style={active && o.color ? { background: o.color, borderColor: o.color, color: '#fff' } : o.color ? { color: o.color } : undefined}
          >
            {o.icon && <o.icon />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Small section label used above each chip group */
export function PickLabel({ icon: Icon, children, aside }) {
  return (
    <div className="pick-label">
      <span className="row" style={{ gap: 6 }}>
        {Icon && <Icon size={15} />}
        {children}
      </span>
      {aside}
    </div>
  );
}
