import { NextResponse, type NextRequest } from "next/server";

// Cheap cookie-presence gate for pages; every API route re-validates the session in the DB.
export function middleware(req: NextRequest) {
  const hasSession = !!req.cookies.get("ilf_session")?.value;
  const { pathname } = req.nextUrl;
  if (!hasSession && pathname !== "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|favicon.ico|icon.svg).*)"] };
