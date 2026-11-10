import { useId, type ChangeEvent } from "react";

export function Field({
  label,
  value,
  onChange,
  multiline = false,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  testId?: string;
}) {
  const id = useId();
  const shared = {
    id,
    value,
    "data-testid": testId,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
  };
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {multiline ? <textarea {...shared} rows={4} /> : <input {...shared} />}
    </label>
  );
}
