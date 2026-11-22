import { CvEditor } from "@/components/CvEditor";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <CvEditor id={(await params).id} />; }
