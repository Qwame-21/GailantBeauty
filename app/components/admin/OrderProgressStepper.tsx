import { AdminIcon } from "./AdminIcons";

export function OrderProgressStepper({ stages, status, onChange }: { stages: string[]; status: string; onChange: (stage: string) => void }) {
  const labels = ["placed", ...stages];
  const active = Math.max(0, labels.indexOf(status));
  return <div className="gb-stepper" aria-label="Record progress"><div className="gb-stepper-line"/><div className="gb-stepper-progress" style={{ width: `${active / (labels.length - 1) * 75}%` }}/>{labels.map((label,index)=><button type="button" key={label} className={`gb-step ${index < active ? "completed" : index === active ? "active" : ""}`} onClick={() => index > 0 && onChange(label)}><span>{index < active ? <AdminIcon name="check"/> : index + 1}</span><strong>{label}</strong><small>{index <= active ? "Current record" : "..."}</small></button>)}</div>;
}
