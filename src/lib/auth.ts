const KEY = "soqour-auth";

export function login(username: string, password: string): boolean {
  if (username === "Alameer" && password === "123456") {
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, "1");
    }
    return true;
  }
  return false;
}

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function logout() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
