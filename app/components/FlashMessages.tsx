import { useFlash } from "../lib/use-flash";

const BASE = "px-4 py-2 mb-4 rounded-[4px]";
const successClass = `${BASE} bg-[#d4edda] text-[#155724]`;
const errorClass = `${BASE} bg-[#f8d7da] text-[#721c24]`;

// shared data 経由で届く flash を表示する。
// page を跨いで使えるよう独立 component に切り出した
export function FlashMessages() {
  const flash = useFlash();

  return (
    <>
      {flash.success && <div className={successClass}>{flash.success}</div>}
      {flash.error && <div className={errorClass}>{flash.error}</div>}
    </>
  );
}
