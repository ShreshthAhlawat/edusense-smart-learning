/**
 * Browser-only face detection + expression estimation.
 * Uses MediaPipe Tasks Vision (WASM, runs fully on-device) — no backend AI.
 */
import type { Expression } from "./engagement";

let landmarkerPromise: Promise<any> | null = null;

export async function getFaceLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision: any = await import(
        /* @vite-ignore */ "https://esm.sh/@mediapipe/tasks-vision@0.10.14" as any
      );
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
      );
      return await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 10,
        outputFaceBlendshapes: true,
      });
    })();
  }
  return landmarkerPromise;
}

type Shapes = Record<string, number>;

function toMap(categories: { categoryName: string; score: number }[]): Shapes {
  const m: Shapes = {};
  categories.forEach((c) => (m[c.categoryName] = c.score));
  return m;
}

/** Classify one face's blendshapes into a coarse expression label. */
export function classifyExpression(categories: { categoryName: string; score: number }[]): Expression {
  const s = toMap(categories);
  const g = (k: string) => s[k] ?? 0;
  const smile = (g("mouthSmileLeft") + g("mouthSmileRight")) / 2;
  const frown = (g("mouthFrownLeft") + g("mouthFrownRight")) / 2;
  const browDown = (g("browDownLeft") + g("browDownRight")) / 2;
  const browUp = (g("browInnerUp") + g("browOuterUpLeft") + g("browOuterUpRight")) / 3;
  const eyeWide = (g("eyeWideLeft") + g("eyeWideRight")) / 2;
  const jawOpen = g("jawOpen");

  const scores: Record<Expression, number> = {
    Happy: smile * 1.6,
    Surprised: (eyeWide + jawOpen + browUp) / 3 * 1.5,
    Fearful: (eyeWide * 0.6 + browUp * 0.6 + frown * 0.4),
    Sad: frown * 1.3 + browUp * 0.3,
    Angry: browDown * 1.4 + frown * 0.3,
    Neutral: 0.32,
  };
  return (Object.entries(scores) as [Expression, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

export type FrameResult = { students: number; expressions: Record<string, number> };

export function analyzeFrame(result: any): FrameResult {
  const faces: any[] = result?.faceBlendshapes ?? [];
  const expressions: Record<string, number> = {};
  faces.forEach((f) => {
    const label = classifyExpression(f.categories ?? []);
    expressions[label] = (expressions[label] ?? 0) + 1;
  });
  const students = result?.faceLandmarks?.length ?? faces.length;
  return { students, expressions };
}
