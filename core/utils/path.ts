export function isLocalPath(path: string) {
  return !(path.startsWith("http://") || path.startsWith("https://"));
}
export function isRemotePath(path: string) {
  return (path.startsWith("http://") || path.startsWith("https://"));
}
