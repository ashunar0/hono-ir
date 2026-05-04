import { usePage } from "@inertiajs/react";
import type { AuthUser } from "../../src/lib/auth-user";

// shared data 経由で全 page に届く auth を型付きで取得する hook
type SharedAuthProps = {
  auth: { user: AuthUser | null };
};

export const useAuth = () => usePage<SharedAuthProps>().props.auth;
