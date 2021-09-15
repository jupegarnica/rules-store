import type { Middleware} from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { ConfigPersistance, StoreJson } from "../core/mod.ts";

const createStoreMiddleWare: (
  conf: ConfigPersistance,
) => Middleware

= (config) => {
  const store = new StoreJson(config);
  const middleware: Middleware = async (context, next) => {
    const path = context.request.url.pathname;
    const method = context.request.method;
    // console.log({path, method});

    switch (method) {
      case "GET": {
        const data = store.getRef(path);
        context.response.body = { data };
        break;
      }
      case "POST": {
        const body = await context.request.body();
        const value = await body.value;
        const oldData = store.getRef(path);
        if (oldData) {
          context.response.status = 405;
          context.response.body = {
            error: "Method not allowed, resource not empty",
          };
          break;
        }
        const data = store.set(path, value);
        store.persist();
        context.response.body = { data };
        break;
      }
      case "PUT": {
        const body = await context.request.body();
        const value = await body.value;

        const data = store.set(path, value);
        store.persist();
        context.response.body = { data };
        break;
      }
      case "PATCH": {
        const body = await context.request.body();
        const value = await body.value;
        const oldData = store.getRef(path);
        if (typeof oldData !== "object") {
          context.response.status = 405;
          context.response.body = {
            error: "Method not allowed, resource not a object",
          };
          break;
        }
        if (typeof value !== "object") {
          context.response.status = 405;
          context.response.body = {
            error: "Method not allowed, body not a object",
          };
          break;
        }
        const data = store.set(path, { ...oldData, ...value });
        store.persist();
        context.response.body = { data };
        break;
      }
      case "DELETE": {
        const data = store.remove(path);
        store.persist();
        context.response.body = { data };
        break;
      }

      default:
        break;
    }
    next();
  };
  return middleware
};

export default createStoreMiddleWare;
