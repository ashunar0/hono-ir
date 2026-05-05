import { useState, type KeyboardEvent } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

// chips 形式の tag 入力。Enter / カンマ で chip 追加、× で個別削除。
// Conduit (RealWorld 公式 frontend) と同じ流派
export function TagInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const next = raw.trim();
    if (!next) return;
    if (value.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...value, next]);
    setDraft("");
  }

  function removeTag(target: string) {
    onChange(value.filter((t) => t !== target));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
      return;
    }
    // 空入力で Backspace なら直前の tag を取り消す
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value[value.length - 1]!);
    }
  }

  return (
    <div>
      <input
        type="text"
        value={draft}
        placeholder="Enter tags"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
      />
      <div style={{ marginTop: "0.4rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {value.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.15rem 0.5rem",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "#aaa",
              borderRadius: "999px",
              fontSize: "0.85rem",
              background: "#f5f5f5",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`remove ${tag}`}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "0.85rem",
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
