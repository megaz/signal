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

export function BrandWeb({ brandId }: Props) {
  const { nodes, competitorNodes, loading } = useAdWeb(brandId);
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    const allNodes = [...nodes, ...competitorNodes];
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const sim = d3
      .forceSimulation(allNodes as d3.SimulationNodeDatum[])
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => healthToRadius((d as AdNode).health_score) + 4));

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
      circles
        .attr("cx", (d) => (d as d3.SimulationNodeDatum & AdNode).x ?? 0)
        .attr("cy", (d) => (d as d3.SimulationNodeDatum & AdNode).y ?? 0);
    });

    return () => { sim.stop(); };
  }, [nodes, competitorNodes, router]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return <svg ref={svgRef} className="flex-1 w-full h-full" />;
}
