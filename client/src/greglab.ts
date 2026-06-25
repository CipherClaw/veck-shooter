// Reads the shared anonymous identity that games.greglab.net set on the parent
// .greglab.net cookie, so this game can forward the token to its own server.
// Falls back to a ?gl=<token> URL param (cross-origin launch) and persists it.
function readCookie(name: string): string | null {
  const match = ("; " + document.cookie).split("; " + name + "=");
  if (match.length === 2) return decodeURIComponent(match.pop()!.split(";")[0]);
  return null;
}

function readParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

const urlToken = readParam("gl");
if (urlToken) {
  document.cookie = "gl_player=" + encodeURIComponent(urlToken) + "; path=/; max-age=31536000; SameSite=Lax";
}

export const glIdentity = {
  token: readCookie("gl_player") ?? urlToken ?? null,
  name: readCookie("gl_name"),
  lobbyUrl: "https://games.greglab.net"
};
