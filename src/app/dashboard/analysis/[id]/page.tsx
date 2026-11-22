import { AnalysisDetail } from "@/components/AnalysisDetail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <AnalysisDetail id={(await params).id} />; }