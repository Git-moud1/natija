import { readManifest } from "@/lib/storage";
import { LandingContent, type ExamSummary } from "@/components/LandingContent";
import type { ExamId } from "@/lib/types";

export const dynamic = "force-dynamic";

const EXAMS: ExamId[] = ["bac", "bepc", "concours"];

export default async function HomePage() {
  const manifest = await readManifest();
  const summaries: Record<string, ExamSummary> = {};
  for (const exam of EXAMS) {
    const entry = manifest.exams[exam];
    summaries[exam] = {
      exam,
      year: entry?.meta.year ?? null,
      count: entry?.meta.count ?? null,
    };
  }
  return <LandingContent summaries={summaries} />;
}
