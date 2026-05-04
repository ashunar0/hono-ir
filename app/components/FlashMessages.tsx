import { useFlash } from "../lib/use-flash";

const baseStyle = {
  padding: "0.5rem 1rem",
  marginBottom: "1rem",
  borderRadius: "4px",
};

const successStyle = { ...baseStyle, background: "#d4edda", color: "#155724" };
const errorStyle = { ...baseStyle, background: "#f8d7da", color: "#721c24" };

// shared data 経由で届く flash を表示する。
// page を跨いで使えるよう独立 component に切り出した
export function FlashMessages() {
  const flash = useFlash();

  return (
    <>
      {flash.success && <div style={successStyle}>{flash.success}</div>}
      {flash.error && <div style={errorStyle}>{flash.error}</div>}
    </>
  );
}
