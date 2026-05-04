// shared data の auth.user に乗せる形。
// server / client 双方で使うのでここに置く。
export type AuthUser = {
  id: number;
  username: string;
  email: string;
  bio: string | null;
  image: string | null;
};
