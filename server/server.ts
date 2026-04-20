/**
 * AppKit server entrypoint.
 *
 * Boots the AppKit app with two plugins:
 *   - server()    : Express HTTP server + static file serving for client/dist
 *   - analytics() : SQL warehouse query infrastructure (currently unused in
 *                    favor of our custom routes, but retained so future
 *                    endpoints can use the type-safe .sql-file pattern)
 *
 * Our CRUD endpoints are registered directly on the Express app via
 * appkit.server.extend(); see server/routes.ts.
 */

import { createApp, server, analytics } from '@databricks/appkit';
import { registerRoutes } from './routes';

createApp({
  plugins: [
    server({ autoStart: false }),
    analytics(),
  ],
})
  .then(async (appkit) => {
    appkit.server.extend((app) => registerRoutes(app));
    await appkit.server.start();
    console.log('Provider Groups (Medicaid Subset) app started.');
  })
  .catch((err: unknown) => {
    console.error('AppKit startup failed:', err);
    process.exit(1);
  });
