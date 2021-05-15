import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { signIn, signUp } from "./routes.ts";

const port = 1357;
const router = new Router();

router
  .post("/signIn", signIn)
  .post("/signUp", signUp);

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port });
console.log("Started on port: " + port);
