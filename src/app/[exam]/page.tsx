import { notFound } from "next/navigation";
import { readManifest } from "@/lib/storage";
import { ExamClient } from "@/components/ExamClient";
import type { ExamId } from "@/lib/types";

export const dynamic = "force-dynamic";

const EXAMS: ExamId[] = ["bac", "bepc", "concours"];

export function generateStaticParams() {
  return EXAMS.map((exam) => ({ exam }));
}

export default async function ExamPage({ params }: { params: Promise<{ exam: string }> }) {
  const { exam } = await params;
  if (!EXAMS.includes(exam as ExamId)) notFound();
  const examId = exam as ExamId;

  const manifest = await readManifest();
  const entry = manifest.exams[examId] ?? null;

  return <ExamClient exam={examId} url={entry?.url ?? null} meta={entry?.meta ?? null} />;
}
