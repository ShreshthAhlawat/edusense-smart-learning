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

/** Classify one face's blendshapes into a classroom mood label. */
export function classifyExpression(categories: { categoryName: string; score: number }[]): Expression {
  const s = toMap(categories);
  const g = (k: string) => s[k] ?? 0;
  const smile = (g("mouthSmileLeft") + g("mouthSmileRight")) / 2;
  const browDown = (g("browDownLeft") + g("browDownRight")) / 2;
  const browInnerUp = g("browInnerUp");
  const squint = (g("eyeSquintLeft") + g("eyeSquintRight")) / 2;
  const blink = (g("eyeBlinkLeft") + g("eyeBlinkRight")) / 2;
  const jawOpen = g("jawOpen");
  const lookAway =
    Math.max(g("eyeLookOutLeft"), g("eyeLookOutRight"), g("eyeLookUpLeft"), g("eyeLookDownRight")) ;
  const lookIn = (g("eyeLookInLeft") + g("eyeLookInRight")) / 2;
  const mouthPucker = g("mouthPucker");

  const scores: Record<Expression, number> = {
    // eyes open, gaze forward, calm brow → attentive
    Focused: (1 - blink) * 0.7 + (1 - lookAway) * 0.6 + lookIn * 0.2 + squint * 0.15,
    Happy: smile * 1.7,
    // furrowed / raised inner brow + squint or pursed lips → puzzled
    Confused: browDown * 0.9 + browInnerUp * 0.8 + squint * 0.5 + mouthPucker * 0.4,
    // gaze off-camera
    Distracted: lookAway * 1.5,
    // droopy eyes, yawning
    Bored: blink * 1.2 + jawOpen * 0.8,
    Neutral: 0.55,
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
