"use client";
import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import { useAdWeb } from "@/hooks/useAdWeb";
import { HEALTH_COLORS } from "@/lib/constants";
import { healthToRadius } from "@/lib/utils";
import type { AdNode } from "@/types/ad";

interface Props {
  brandId: string;
}

type SimNode = d3.SimulationNodeDatum & AdNode;

interface FamilyLink {
  source: SimNode;
  target: SimNode;
}

function buildFamilyLinks(nodes: AdNode[]): FamilyLink[] {
  const links: FamilyLink[] = [];
  const withFamily = nodes.filter((n) => n.creative_family_id);
  const families = d3.group(withFamily, (d) => d.creative_family_id!);

  families.forEach((members) => {
    if (members.length < 2) return;
    for (let i = 0; i < members.length - 1; i++) {
      links.push({
        source: members[i] as SimNode,
        target: members[i + 1] as SimNode,
      });
    }
  });

  return links;
}

export function BrandWeb({ brandId }: Props) {
  const { nodes, competitorNodes, loading } = useAdWeb(brandId);
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    const allNodes = [...nodes, ...competitorNodes] as SimNode[];
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const familyLinks = buildFamilyLinks(allNodes);

    const sim = d3
      .forceSimulation(allNodes)
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => healthToRadius((d as AdNode).health_score) + 4));

    const lines = svg
      .selectAll("line")
      .data(familyLinks)
      .enter()
      .append("line")
      .attr("stroke", "#374151")
      .attr("stroke-width", 1)
      .attr("opacity", 0.4);

    const circles = svg
      .selectAll("circle")
      .data(allNodes)
      .enter()
      .append("circle")
      .attr("r", (d) => healthToRadius(d.health_score))
      .attr("fill", (d) => HEALTH_COLORS[d.health])
      .attr("opacity", 0.85)
      .attr("class", (d) => (d.health === "fatiguing" ? "pulse-glow" : ""))
      .style("cursor", "pointer")
      .on("click", (_, d) => router.push(`/canvas/${d.id}`));

    sim.on("tick", () => {
      lines
        .attr("x1", (d) => d.source.x ?? 0)
        .attr("y1", (d) => d.source.y ?? 0)
        .attr("x2", (d) => d.target.x ?? 0)
        .attr("y2", (d) => d.target.y ?? 0);

      circles
        .attr("cx", (d) => d.x ?? 0)
        .attr("cy", (d) => d.y ?? 0);
    });

    return () => { sim.stop(); };
  }, [nodes, competitorNodes, router]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return <svg ref={svgRef} className="flex-1 w-full h-full" />;
}
