import type { Middleware,Context } from 'https://deno.land/x/oak@v9.0.0/mod.ts';
import  { helpers } from 'https://deno.land/x/oak@v9.0.1/mod.ts';
import {
  ConfigPersistance,
  StoreJson,
  PermissionError,
  ValidationError,
} from '../core/mod.ts';
import {
  bold,
  red,
} from 'https://deno.land/std@0.105.0/fmt/colors.ts';

const createStoreMiddleWare: (
  conf: ConfigPersistance,
) => Middleware = (config) => {
  const store = new StoreJson(config);
  const middleware: Middleware = async (context, next) => {
    const path = context.request.url.pathname;
    const method = context.request.method;

    try {
      switch (method) {
        case 'GET': {
          const query = [...context.request.url.searchParams.entries()];

          if (query.length) {
            const data = store.find(path, ([, record])=> {
                return query.every(([key, value])=> record[key]=== value)

            }).map(([,v])=>v);
            context.response.body = { data };

          } else {

            const data = store.getRef(path);

            context.response.body = { data };
          }
          break;

        }
        case 'POST': {
          const body = await context.request.body();
          const value = await body.value;
          const data = store.push(path, value);
          store.persist();
          context.response.body = { data };
          break;
        }
        case 'PUT': {
          const body = await context.request.body();
          const value = await body.value;

          const data = store.set(path, value);
          store.persist();
          context.response.body = { data };
          break;
        }
        case 'PATCH': {
          const body = await context.request.body();
          const value = await body.value;
          const oldData = store.getRef(path);
          if (typeof oldData !== 'object') {
            throw new TypeError('Target not a object');
          }
          if (typeof value !== 'object') {
            throw new TypeError('Body not a object');
          }
          const data = store.set(path, { ...oldData, ...value });
          store.persist();
          context.response.body = { data };
          break;
        }
        case 'DELETE': {
          const returnRemoved =
            context.request.headers.get('x-return-removed') ===
            'true';
          const data = store.remove(path, returnRemoved);
          store.persist();
          if (data) {
            context.response.status = 200;
            context.response.body = { data };
          } else {
            context.response.status = 204;
          }

          break;
        }

        default:
          throw new Error('Invalid method');
      }
    } catch (error) {
      console.error(bold(red(error.name)), error.message);

      switch (error.constructor) {
        case PermissionError:
          context.response.status = 403;
          context.response.body = {
            error: 'Forbidden - ' + error.message,
          };

          break;
        case TypeError:
          context.response.body = {
            error: 'Method not allowed - ' + error.message,
          };
          context.response.status = 405;
          break;
        case ValidationError: {
          context.response.body = {
            error: 'Validation Error - ' + error.message,
          };
          context.response.status = 422;
          break;
        }
        default:
          context.response.status = 500;
          context.response.body = {
            error: error.message,
          };

          break;
      }
    }
    next();
  };
  return middleware;
};

export default createStoreMiddleWare;
