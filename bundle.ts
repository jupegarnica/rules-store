try {
  const { files } = await Deno.emit("./src/StoreLocalStorage.ts", {
    bundle: "esm",
    // compilerOptions: {
    //   target: "es3",
    // },
  });
  for (const key in files) {
    await Deno.writeTextFile("dist/StoreLocalStorage.mjs", files[key]);
  }
} catch (e) {
  // something went wrong, inspect `e` to determine
  console.log(e);
}
