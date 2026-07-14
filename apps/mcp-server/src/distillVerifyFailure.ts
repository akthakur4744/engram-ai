/**
 * Distill a failed verify run into incident-type observation proposals.
 * Does NOT persist — returns proposals for human approval (harness "prevent recurrence").
 */
import type { ObservationInput } from "@em/shared";
import { reflect, type Rag } from "@em/rag";

export async function distillVerifyFailure(
  rag: Rag,
  verifyOutput: string,
): Promise<ObservationInput[]> {
  const proposals = await reflect(rag, {
    question: "What engineering lesson should we remember from this verify failure?",
    answer: `VERIFY FAILURE OUTPUT:\n${verifyOutput.slice(0, 8000)}`,
  });

  // Bias proposals toward incident type when the reflector didn't classify them
  return proposals.map((p: ObservationInput) => ({
    ...p,
    type: p.type === "observation" ? "incident" : p.type,
    source: "verify-failure",
    confidence: 0.4,
  }));
}
