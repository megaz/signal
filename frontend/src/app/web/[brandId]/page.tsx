import { BrandWeb } from "@/components/web/BrandWeb";
import { StatsBar } from "@/components/web/StatsBar";

interface Props {
  params: { brandId: string };
}

export default function WebScreen({ params }: Props) {
  return (
    <main className="flex flex-col h-screen overflow-hidden">
      <StatsBar brandId={params.brandId} />
      <BrandWeb brandId={params.brandId} />
    </main>
  );
}
