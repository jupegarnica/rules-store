import { Application } from 'https://deno.land/x/oak@v9.0.0/mod.ts';
import {
  bold,
  yellow,
  green,
  red
} from 'https://deno.land/std@0.105.0/fmt/colors.ts';
import createStoreMiddleWare from './middleware.ts';
const app = new Application();

// Logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get('X-Response-Time');
  const status = ctx.response.status;
  console.log(
    ((status >= 200 && status < 300 )? green(String(status)) : red(String(status))),
    bold(`${ctx.request.method}`),
    ` ${ctx.request.url.pathname}`,
    yellow(`${rt}`),
  );
});
// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set('X-Response-Time', `${ms}ms`);
});
app.use(createStoreMiddleWare({ name: 'db.json' }));

app.addEventListener('listen', ({ hostname, port }) => {
  console.log(
    bold('Start listening on ') + yellow(`${hostname}:${port}`),
  );
  // console.log(bold("  using HTTP server: " + yellow(serverType)));
});
await app.listen({ port: 8000 });
