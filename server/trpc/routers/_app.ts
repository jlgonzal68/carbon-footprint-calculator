import { router } from "../../_core/trpc";
import { carbonRouter } from "./carbon";
import { metasRouter } from "./metas";

export const appRouter = router({
  carbon: carbonRouter,
  metas: metasRouter,
});

export type AppRouter = typeof appRouter;
