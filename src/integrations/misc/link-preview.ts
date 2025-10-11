// Re-export Open Graph parser functions from shared module
// Replaced open-graph-scraper with lightweight custom implementation using fetch + linkedom

export type { OpenGraphData } from "@shared/open_graph_parser"
export { detectImageUrl, fetchOpenGraphData } from "@shared/open_graph_parser"
