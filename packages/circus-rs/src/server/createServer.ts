import koa from 'koa';
import httpStatus from 'http-status';
import Router from 'koa-router';
import koaJson from 'koa-json';

import { Configuration } from './Configuration';
import { RsServices } from './helper/createServiceLoader';

// middleware
import cors from './app/middleware/cors';
import ipBasedAccessControl from './app/middleware/ipBasedAccessControl';
import errorHandler from './app/middleware/errorHandler';
import countUp from './app/middleware/countUp';

// basic routes
import serverStatus from './app/serverStatus';

// authentication
import issueSeriesAccessToken from './app/auth/issueSeriesAccessToken';
import checkSeriesAccessToken from './app/auth/checkSeriesAccessToken';

// application
import seriesRoutes from './app/series/seriesRoutes';
import { FunctionService } from '@utrad-ical/circus-lib';
import createAuthorizer from './helper/createAuthorizer';

/**
 * Create Koa App.
 */
const createServer: FunctionService<koa> = async (
  options: Configuration['rsServer']['options'],
  deps: RsServices
) => {
  const { authorization, globalIpFilter } = options;
  const { rsLogger, counter, imageEncoder, volumeProvider } = deps;

  // create server process
  const app = new koa();

  // Set up global IP filter
  if (typeof globalIpFilter === 'string') {
    app.use(ipBasedAccessControl({ rsLogger, allowPattern: globalIpFilter }));
  }

  // // Pretty-pring JSON output
  app.use(koaJson());

  // Adds an error handler which outputs all errors in JSON format
  app.use(errorHandler({ rsLogger }));

  // Add global request handler
  app.use(cors());

  // Counts the number of requests
  app.use(countUp({ counter }));

  const router = new Router();
  router.get('/status', serverStatus({ config: options, modules: deps }));

  // authorization
  if (authorization && authorization.enabled) {
    const authorizer = createAuthorizer(authorization);
    router.get(
      '/token',
      issueSeriesAccessToken({
        rsLogger,
        authorizer,
        ipFilter: authorization.tokenRequestIpFilter
      })
    );
    router.use(
      '/series/:sid',
      checkSeriesAccessToken({ rsLogger, authorizer })
    );
    (app as any).dispose = async () =>
      authorizer.dispose && (await authorizer.dispose());
  }

  // series
  if (volumeProvider && imageEncoder) {
    router.use(
      '/series/:sid',
      seriesRoutes({
        logger: rsLogger,
        volumeProvider,
        imageEncoder
      })
    );
  }

  app.use(router.routes());

  // This is a default handler to catch all unknown requests of all types of verbs
  app.use(async (ctx: koa.DefaultContext, next: koa.Next) => {
    ctx.throw(httpStatus.NOT_FOUND);
  });

  return app;
};

createServer.dependencies = [
  'rsLogger',
  'counter',
  'imageEncoder',
  'volumeProvider'
];

export default createServer;
