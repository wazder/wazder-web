// /fastcat -> /fastcat/ ; the game shell needs the trailing slash so its
// relative asset paths resolve. Files come from functions/fastcat/[[path]].ts.
export const onRequest: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  url.pathname = '/fastcat/';
  return Response.redirect(url.toString(), 308);
};
