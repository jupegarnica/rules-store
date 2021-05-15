import { Context } from "https://deno.land/x/oak/mod.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.2/mod.ts";
import type { Payload } from "https://deno.land/x/djwt@v2.2/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.2.4/mod.ts";
import { v4 } from "https://deno.land/std@0.95.0/uuid/mod.ts";
import { authStore } from "./authStore.ts";
import { ValidationError } from "../core/Errors.ts";
const key = Deno.env.get("JWT-SECRET") ?? "secret";

export const signIn = async (ctx: Context) => {
  const { value } = ctx.request.body();
  const { email, password } = (await value);

  const [uuid, user] = authStore.findOne(
    `users`,
    ([, user]) => user.email == email,
  );
  if (!uuid) {
    ctx.response.status = 401;
    return;
  }

  if (!bcrypt.compareSync(password, user.password)) {
    ctx.response.status = 401;
    return;
  }

  const payload: Payload = {
    iss: user,
    exp: getNumericDate(new Date().getTime() + 60000),
  };

  const jwt = await create(
    {
      alg: "HS256",
      typ: "JWT",
    },
    payload,
    key,
  );

  ctx.response.status = 200;
  ctx.response.body = {
    ...user,
    password: undefined,
    jwt,
  };
};

export const signUp = async (ctx: Context) => {
  try {
    const { value } = ctx.request.body();
    const body = (await value);
    const uuid = v4.generate();
    // const uuid = "0251fc54-22e8-4a94-9928-fa3b74003d9d";
    const newUser = authStore.set(`users/${uuid}`, body);
    ctx.response.body = newUser;
  } catch (error) {
    if (error instanceof ValidationError) {
      ctx.response.status = 400;
      ctx.response.body = {
        error: error.name,
        message: error.message,
      };
    } else {
      throw error;
    }
  }
};
