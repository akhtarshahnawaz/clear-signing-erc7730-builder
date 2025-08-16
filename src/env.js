import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_GTM: z.string(),
    NEXT_PUBLIC_ONETRUST: z.string(),
    NEXT_PUBLIC_WALRUS_PUBLISHER_URL: z.string().optional(),
    NEXT_PUBLIC_WALRUS_AGGREGATOR_URL: z.string().optional(),
    NEXT_PUBLIC_CONTRACT_ADDRESS: z.string().optional(),
    NEXT_PUBLIC_CHAIN_ID: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_GTM: process.env.NEXT_PUBLIC_GTM,
    NEXT_PUBLIC_ONETRUST: process.env.NEXT_PUBLIC_ONETRUST,
    NEXT_PUBLIC_WALRUS_PUBLISHER_URL: process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL,
    NEXT_PUBLIC_WALRUS_AGGREGATOR_URL: process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL,
    NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: true,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,

});
