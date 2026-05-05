import { router } from "@inertiajs/react";

type VisitData = Parameters<typeof router.post>[1];
type VisitOpts = Parameters<typeof router.post>[2];

// Inertia router の visit メソッドを Promise 化したラッパー群。
// `await visit.post(url, data, opts)` の形で書ける。
// useOptimistic + startTransition で「await できる遷移」が要る場面で使う。
//
// Inertia 本体に「Promise を返す router API」を提案する PR の素材。
// upstream 採用後はこのラッパー削除予定。
export const visit = {
  post(url: string, data?: VisitData, opts?: VisitOpts): Promise<void> {
    return new Promise<void>((resolve) => {
      const userFinish = opts?.onFinish;
      router.post(url, data, {
        ...opts,
        onFinish: (visit) => {
          userFinish?.(visit);
          resolve();
        },
      });
    });
  },
  delete(url: string, opts?: VisitOpts): Promise<void> {
    return new Promise<void>((resolve) => {
      const userFinish = opts?.onFinish;
      router.delete(url, {
        ...opts,
        onFinish: (visit) => {
          userFinish?.(visit);
          resolve();
        },
      });
    });
  },
};
