/**
 * Channels shown in the viewer page's left sidebar ("Recommended").
 * Mock-only — Kick serves this from its own recommendation endpoints.
 */
export interface RecommendedChannel {
  slug: string;
  name: string;
  category: string;
  /** null -> render "LIVE" instead of a viewer count */
  viewers: number | null;
  /** avatar fallback background color */
  color: string;
}

export const mockRecommended: RecommendedChannel[] = [
  { slug: "thedoctor", name: "TheDoctor", category: "Slots & Casino", viewers: 139, color: "#2f855a" },
  { slug: "gokhanoner", name: "GokhanOner", category: "IRL", viewers: 1400, color: "#6b46c1" },
  { slug: "anythingelse", name: "anythingelse", category: "Just Chatting", viewers: 4500, color: "#c05621" },
  { slug: "hstikkytokky", name: "hstikkytokky", category: "Slots & Casino", viewers: 6900, color: "#2b6cb0" },
  { slug: "n3on", name: "n3on", category: "IRL", viewers: 31400, color: "#9b2c2c" },
  { slug: "deenthegreat", name: "DeenTheGreat", category: "IRL", viewers: 14100, color: "#285e61" },
  { slug: "clavicular", name: "clavicular", category: "Slots & Casino", viewers: null, color: "#4a5568" },
  { slug: "naya_asad", name: "naya_asad", category: "Just Chatting", viewers: 464, color: "#b83280" },
  { slug: "cuffem", name: "Cuffem", category: "Just Chatting", viewers: 14000, color: "#975a16" },
  { slug: "drchubzdpt", name: "DrChubzDPT", category: "Pools & Beach", viewers: 1000, color: "#3182ce" },
];
