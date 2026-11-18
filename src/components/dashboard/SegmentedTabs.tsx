export type SegmentedTabOption<T extends string> = { value: T; label: string };

type SegmentedTabsProps<T extends string> = {
  options: SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
};

export function SegmentedTabs<T extends string>({ options, value, onChange, ...rest }: SegmentedTabsProps<T>) {
  return (
    <div className="segmented-tabs" role="tablist" aria-label={rest["aria-label"]}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={`segmented-tab${option.value === value ? " segmented-tab-active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
