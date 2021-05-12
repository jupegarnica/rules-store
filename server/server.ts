import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { signin, signup } from "./routes.ts";

const port = 1357;
const router = new Router();

router
  .post("/signin", signin)
  .post("/signup", signup);

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port });
console.log("Started on port: " + port);
