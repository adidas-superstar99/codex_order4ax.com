export function CustomRequestInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>개인 요청사항</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="예: 얼음 적게, 시럽 추가, 휘핑 제외"
        rows={3}
      />
    </label>
  );
}
