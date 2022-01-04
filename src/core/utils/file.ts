export async function getContent(filePath: string) {
  const content = await Deno.readTextFile(filePath);
  return content;
}
