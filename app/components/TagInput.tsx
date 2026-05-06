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
        className="block w-full px-2 py-1"
      />
      <div className="mt-[0.4rem] flex flex-wrap gap-[0.4rem]">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-[0.15rem] text-[0.85rem] rounded-full border border-[#aaa] bg-[#f5f5f5]"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`remove ${tag}`}
              className="border-0 bg-transparent cursor-pointer text-[0.85rem] leading-none p-0"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
