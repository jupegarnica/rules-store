try {
  const { files } = await Deno.emit("./src/StoreLocalStorage.ts", {
    bundle: "esm",
  });
  for (const key in files) {
    await Deno.writeTextFile("dist/StoreLocalStorage.mjs", files[key]);
  }
} catch (e) {
  console.error(e);
}

try {
  const { files } = await Deno.emit("./src/StoreSessionStorage.ts", {
    bundle: "esm",
  });
  for (const key in files) {
    await Deno.writeTextFile("dist/StoreSessionStorage.mjs", files[key]);
  }
} catch (e) {
  console.error(e);
}
