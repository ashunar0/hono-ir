import { useFlash } from "../lib/use-flash";

const BASE = "px-4 py-2 mb-4 rounded";
const successClass = `${BASE} bg-green-100 text-green-800`;
const errorClass = `${BASE} bg-red-100 text-red-800`;

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
