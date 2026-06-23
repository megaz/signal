import { ReviewDrop } from "@/components/review/ReviewDrop";

export default function ReviewScreen() {
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 tracking-tight">Review &amp; Handoff</h1>
      <ReviewDrop />
    </main>
  );
}
