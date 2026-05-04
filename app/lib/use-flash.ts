import { usePage } from "@inertiajs/react";
import type { Flash } from "../../src/lib/flash";

// shared data 経由で全 page に届く flash を型付きで取得する hook
type SharedFlashProps = {
  flash: Flash;
};

export const useFlash = () => usePage<SharedFlashProps>().props.flash;
