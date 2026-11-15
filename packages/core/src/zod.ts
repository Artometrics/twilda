import { z } from "zod";

/**
 * Zod 4 builds a specialised parser with `new Function` when it can. The pages and the desk run
 * under a Content-Security-Policy with no `unsafe-eval`, and even a probe that is caught is reported
 * as a violation. Turn the compiler off before any schema is made, so no code is ever generated.
 * Parsing is a little slower and gives the same results.
 */
z.config({ jitless: true });

export { z };
