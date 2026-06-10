Deno.serve((req, ctx) => {
  if (ctx && ctx.waitUntil) {
    console.log("waitUntil is supported!");
  } else {
    console.log("waitUntil NOT supported!");
  }
  return new Response("ok");
});
