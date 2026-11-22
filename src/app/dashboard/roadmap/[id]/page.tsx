import { RoadmapDetail } from "@/components/RoadmapDetail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <RoadmapDetail id={(await params).id} />; }
