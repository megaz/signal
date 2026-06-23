import { BeatCanvas } from "@/components/canvas/BeatCanvas";
import { CoPilot } from "@/components/canvas/CoPilot";

interface Props {
  params: { adId: string };
}

export default function CanvasScreen({ params }: Props) {
  return (
    <main className="relative flex h-screen overflow-hidden">
      <BeatCanvas adId={params.adId} />
      <CoPilot adId={params.adId} />
    </main>
  );
}
