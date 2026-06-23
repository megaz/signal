import { redirect } from "next/navigation";

// Demo: redirect root to a sample brand's web view
export default function Home() {
  redirect("/web/demo-brand");
}
