import { router } from "../../_core/trpc";
import { carbonRouter } from "./carbon";

export const appRouter = router({
  carbon: carbonRouter,
});

export type AppRouter = typeof appRouter;
