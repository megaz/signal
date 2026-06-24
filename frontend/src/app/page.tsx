import { redirect } from "next/navigation";

const CELSIUS_BRAND_ID =
  process.env.NEXT_PUBLIC_DEMO_BRAND_ID ?? "1ad089e1-9e52-435a-883d-004966a456e1";

export default function Home() {
  redirect(`/web/${CELSIUS_BRAND_ID}`);
}
