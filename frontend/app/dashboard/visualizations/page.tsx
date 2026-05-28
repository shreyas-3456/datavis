import type { Metadata } from "next";
import { VisualizationBuilder } from "@/components/dashboard/visualizations/VisualizationBuilder";

export const metadata: Metadata = {
  title: "Visualizations | DataVis Platform",
  description: "Build, configure, and customize beautiful charts and graphs from your datasets using our premium visualization builder.",
};

export default function VisualizationsPage() {
  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden">
      <h1 className="sr-only">Visualization Builder</h1>
      <VisualizationBuilder />
    </div>
  );
}
