import { headers } from "next/headers";

export async function getOrigin(): Promise<string> {
  const headerList = await headers();
  const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "127.0.0.1:43123")
    .split(",")[0]
    .trim();
  const proto = (headerList.get("x-forwarded-proto") ?? "http").split(",")[0].trim();
  return `${proto}://${host}`;
}
