"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type PhotoItem = { id: string; file: File; preview: string };
type Metrics = { brightness: number; composition: number; sharpness: number; expression: number };
type Interpretation = { brightness: string; composition: string; sharpness: string };
type PhotoMetrics = Metrics & {
  total: number;
  summary: string[];
  detail: string;
  tip: string;
  interpretations: Interpretation;
};
type RankedPhoto = { slotIndex: number; photo: PhotoItem; metrics: PhotoMetrics };
type CategoryKey = "profile" | "instagram" | "dating" | "thumbnail" | "daily";
type CategoryConfig = {
  label: string;
  subtitle: string;
  intro: string;
  lead: string;
  weights: Metrics;
  brightness: { high: string; mid: string; low: string };
  composition: { high: string; mid: string; low: string };
  sharpness: { high: string; mid: string; low: string };
  expression: string;
  detail: (name: string, i: Interpretation) => string;
  tips: { brightness: string; composition: string; sharpness: string; default: string };
};

const MAX_PHOTOS = 3;

const CATEGORIES: Record<CategoryKey, CategoryConfig> = {
  profile: {
    label: "프로필 사진",
    subtitle: "얼굴 중심 구도와 또렷한 인상을 더 중요하게 봐요.",
    intro: "프로필 사진은 얼굴 인상이 깔끔하게 전달되는 컷이 가장 안정적이에요.",
    lead: "프로필 사진으로는",
    weights: { brightness: 0.28, composition: 0.34, sharpness: 0.24, expression: 0.14 },
    brightness: {
      high: "밝기: 얼굴 톤이 깨끗하게 보여 안정적",
      mid: "밝기: 무난하지만 조금 더 밝으면 더 또렷해짐",
      low: "밝기: 다소 어두워 첫인상이 약해질 수 있음",
    },
    composition: {
      high: "구도: 얼굴 중심이 잘 잡혀 대표 사진으로 적합",
      mid: "구도: 비교적 안정적이라 무난하게 사용 가능",
      low: "구도: 중심감이 약해 프로필용 임팩트가 덜함",
    },
    sharpness: {
      high: "선명도: 윤곽이 또렷해 인상이 깔끔하게 전달됨",
      mid: "선명도: 부드럽지만 전체적으로 무난함",
      low: "선명도: 흐릿하게 보여 대표 사진으로는 아쉬움",
    },
    expression: "표정 안정성: 부담 없이 편안한 인상으로 보여요.",
    detail: (_, i) =>
      `프로필 사진으로는 얼굴 인상이 또렷하게 보이는 이 사진이 가장 안정적입니다. ${i.brightness}이고, ${i.composition}이라 첫 화면에서 가장 정돈된 느낌을 줍니다.`,
    tips: {
      brightness: "밝기를 살짝만 올리면 프로필 사진으로 더 환하고 또렷하게 느껴질 수 있어요.",
      composition: "얼굴이 프레임 중앙으로 조금 더 오도록 크롭하면 더 정돈된 프로필 느낌이 납니다.",
      sharpness: "조금 더 또렷한 원본 컷이 있다면 대표 사진으로는 그쪽이 더 잘 어울릴 수 있어요.",
      default: "배경이 더 단순한 컷이 있다면 프로필 사진으로는 훨씬 깔끔하게 보일 수 있어요.",
    },
  },
  instagram: {
    label: "인스타 업로드",
    subtitle: "분위기와 밝기 밸런스, 전체 무드를 더 반영해요.",
    intro: "인스타 사진은 분위기와 전체 장면의 자연스러움이 중요해요.",
    lead: "인스타 업로드용으로는",
    weights: { brightness: 0.33, composition: 0.27, sharpness: 0.18, expression: 0.22 },
    brightness: {
      high: "밝기: 피드에 올렸을 때 분위기가 화사하게 살아남",
      mid: "밝기: 자연스럽지만 톤 보정 여지는 있음",
      low: "밝기: 전체 무드가 조금 답답하게 느껴질 수 있음",
    },
    composition: {
      high: "구도: 장면이 안정적이라 피드에서 시선이 잘 머무름",
      mid: "구도: 무난하지만 임팩트는 보통 수준",
      low: "구도: 장면 중심이 흐려 보여 덜 돋보임",
    },
    sharpness: {
      high: "선명도: 인물과 배경이 깔끔하게 정리되어 보임",
      mid: "선명도: 전체적으로 부드럽고 무난한 편",
      low: "선명도: 살짝 흐려 분위기가 탁하게 느껴질 수 있음",
    },
    expression: "표정 안정성: 과하지 않고 자연스러운 무드가 잘 살아나요.",
    detail: (_, i) =>
      `인스타 업로드용으로는 배경과 분위기가 가장 자연스러운 이 사진이 더 잘 어울립니다. ${i.brightness}이고 ${i.composition}이라 피드 안에서도 편안하게 눈에 들어와요.`,
    tips: {
      brightness: "톤을 조금만 더 밝게 정리하면 피드에서 훨씬 화사하게 보일 수 있어요.",
      composition: "배경 비중을 살짝 줄이면 인물에 시선이 더 모여 업로드용 완성도가 올라가요.",
      sharpness: "선명도를 약하게만 보정해도 전체 무드가 한결 더 깨끗해질 수 있어요.",
      default: "비슷한 무드의 컷을 한 장 더 추가하면 어떤 분위기가 더 잘 받는지 비교하기 쉬워져요.",
    },
  },
  dating: {
    label: "소개팅/호감형 사진",
    subtitle: "밝은 인상과 편안한 분위기를 더 중요하게 반영해요.",
    intro: "호감형 사진은 편안한 표정과 환한 첫인상이 자연스럽게 전달되는 컷이 좋아요.",
    lead: "소개팅이나 호감형 사진으로는",
    weights: { brightness: 0.3, composition: 0.26, sharpness: 0.16, expression: 0.28 },
    brightness: {
      high: "밝기: 인상이 환하게 보여 첫 느낌이 부드럽게 전달됨",
      mid: "밝기: 무난하지만 조금 더 화사하면 더 좋음",
      low: "밝기: 다소 어두워 표정의 장점이 덜 살아남",
    },
    composition: {
      high: "구도: 얼굴 중심이 안정적이라 시선이 편안하게 머무름",
      mid: "구도: 무난하지만 더 정돈되면 훨씬 좋아짐",
      low: "구도: 시선이 분산돼 인물 인상이 약해질 수 있음",
    },
    sharpness: {
      high: "선명도: 눈매와 표정이 또렷해 신뢰감이 느껴짐",
      mid: "선명도: 전체적으로 무난하지만 조금 더 또렷하면 좋음",
      low: "선명도: 살짝 흐려 표정 전달력이 떨어질 수 있음",
    },
    expression: "표정 안정성: 편안하고 부담 없는 분위기로 보여요.",
    detail: (_, i) =>
      `소개팅이나 호감형 사진으로는 이 컷이 가장 편안한 첫인상을 줍니다. ${i.brightness}이고 ${i.composition}이라 상대가 보기에도 부담 없이 자연스럽게 느껴질 가능성이 높아요.`,
    tips: {
      brightness: "밝기를 조금만 올려도 인상이 훨씬 환하고 친근하게 느껴질 수 있어요.",
      composition: "얼굴이 조금 더 중앙에 오도록 자르면 시선이 자연스럽게 인물에 머물러요.",
      sharpness: "눈 주변이 더 또렷한 컷이 있으면 호감형 사진으로는 더 안정적으로 보일 수 있어요.",
      default: "살짝 웃는 느낌이 더 보이는 컷을 함께 올리면 호감형 사진 비교가 더 설득력 있어져요.",
    },
  },
  thumbnail: {
    label: "썸네일/홍보용",
    subtitle: "시선 집중이 잘 되는 구도와 선명도를 더 크게 봐요.",
    intro: "썸네일은 작은 화면에서도 바로 눈에 들어오는 구도와 선명도가 중요해요.",
    lead: "썸네일이나 홍보용으로는",
    weights: { brightness: 0.24, composition: 0.31, sharpness: 0.31, expression: 0.14 },
    brightness: {
      high: "밝기: 썸네일에서도 화면이 답답하지 않고 또렷함",
      mid: "밝기: 무난하지만 대비를 조금 더 주면 좋음",
      low: "밝기: 작은 화면에서는 묻혀 보일 수 있음",
    },
    composition: {
      high: "구도: 시선이 한 번에 모여 썸네일용 강점이 있음",
      mid: "구도: 비교적 안정적이지만 주목도는 보통",
      low: "구도: 시선이 분산돼 홍보용 임팩트가 약함",
    },
    sharpness: {
      high: "선명도: 작은 화면에서도 디테일이 잘 살아남",
      mid: "선명도: 무난하지만 조금 더 또렷하면 좋음",
      low: "선명도: 흐릿하게 보여 썸네일용으로는 아쉬움",
    },
    expression: "표정 안정성: 전달하고 싶은 분위기가 무난하게 느껴져요.",
    detail: (_, i) =>
      `썸네일이나 홍보용으로는 이 사진이 가장 시선을 잘 모읍니다. ${i.composition}이고 ${i.sharpness}라 작은 화면에서도 비교적 또렷하게 보일 가능성이 높아요.`,
    tips: {
      brightness: "밝기와 대비를 조금 더 주면 썸네일에서 훨씬 눈에 띄는 사진이 될 수 있어요.",
      composition: "인물이 조금 더 중앙에 보이도록 정리하면 썸네일 클릭 유도가 더 잘 됩니다.",
      sharpness: "선명한 원본을 쓰면 작은 사이즈에서도 디테일이 훨씬 잘 살아나요.",
      default: "배경 요소가 적은 컷이 있다면 홍보용 이미지로는 더 강한 인상을 줄 수 있어요.",
    },
  },
  daily: {
    label: "자연스러운 일상 사진",
    subtitle: "과하지 않은 밝기와 편안한 분위기를 우선해요.",
    intro: "일상 사진은 너무 꾸민 느낌보다 자연스럽고 편안한 무드가 중요해요.",
    lead: "자연스러운 일상 사진으로는",
    weights: { brightness: 0.29, composition: 0.24, sharpness: 0.17, expression: 0.3 },
    brightness: {
      high: "밝기: 전체 무드가 편안하고 산뜻하게 느껴짐",
      mid: "밝기: 자연스럽지만 살짝 더 정리하면 좋음",
      low: "밝기: 조금 답답하게 보여 일상 무드가 덜 살아남",
    },
    composition: {
      high: "구도: 인물과 배경의 균형이 자연스럽게 느껴짐",
      mid: "구도: 전반적으로 무난하고 편안한 편",
      low: "구도: 장면 균형이 조금 아쉬워 일상 컷 느낌이 약함",
    },
    sharpness: {
      high: "선명도: 무드는 유지되면서도 깔끔하게 보임",
      mid: "선명도: 부드러운 편이라 일상 사진으로는 무난함",
      low: "선명도: 흐릿하게 느껴져 사진 매력이 덜 살아남",
    },
    expression: "표정 안정성: 힘이 들어가지 않은 자연스러운 분위기예요.",
    detail: (_, i) =>
      `자연스러운 일상 사진으로는 이 컷이 가장 편안하게 느껴집니다. ${i.brightness}이고 ${i.composition}이라 과한 느낌 없이 보기 좋은 인상을 줘요.`,
    tips: {
      brightness: "자연광 느낌이 조금 더 살아나도록 밝기만 살짝 보정하면 훨씬 예쁘게 느껴질 수 있어요.",
      composition: "배경이 너무 넓다면 살짝 크롭해서 인물과 분위기 균형을 맞춰보세요.",
      sharpness: "흔들림이 적은 컷을 한 장 더 추가하면 일상 사진 추천 결과가 더 안정적일 수 있어요.",
      default: "비슷한 표정의 컷을 함께 올리면 어떤 사진이 가장 자연스럽게 느껴지는지 더 잘 비교할 수 있어요.",
    },
  },
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function band(score: number, text: { high: string; mid: string; low: string }) {
  if (score >= 80) return text.high;
  if (score >= 65) return text.mid;
  return text.low;
}

function shortLabel(score: number) {
  if (score >= 80) return "안정적";
  if (score >= 65) return "무난";
  return "조금 아쉬움";
}

async function analyzeImage(previewUrl: string): Promise<Metrics> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = previewUrl;
  });

  const targetWidth = 180;
  const ratio = targetWidth / image.width;
  const targetHeight = Math.max(120, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("이미지 분석용 캔버스를 생성하지 못했습니다.");

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  const { data, width, height } = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const count = width * height;
  const gray = new Float32Array(count);
  let brightnessSum = 0;

  for (let i = 0; i < count; i += 1) {
    const offset = i * 4;
    const value = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
    gray[i] = value;
    brightnessSum += value;
  }

  const brightness = clamp(100 - Math.abs(brightnessSum / count - 172) * 1.1);

  let energySum = 0;
  let weightedX = 0;
  let weightedY = 0;
  let sharpnessRaw = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] + gray[i - width + 1] - 2 * gray[i - 1] + 2 * gray[i + 1] - gray[i + width - 1] + gray[i + width + 1];
      const gy =
        gray[i - width - 1] + 2 * gray[i - width] + gray[i - width + 1] - gray[i + width - 1] - 2 * gray[i + width] - gray[i + width + 1];
      const energy = Math.sqrt(gx * gx + gy * gy);
      energySum += energy;
      weightedX += energy * x;
      weightedY += energy * y;
      sharpnessRaw += Math.abs(gx) + Math.abs(gy);
    }
  }

  const centerX = energySum > 0 ? weightedX / energySum : width / 2;
  const centerY = energySum > 0 ? weightedY / energySum : height / 2;
  const dx = centerX - width / 2;
  const dy = centerY - height / 2;
  const maxDistance = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
  const composition = clamp(100 - (Math.sqrt(dx * dx + dy * dy) / maxDistance) * 128);
  const sharpness = clamp((sharpnessRaw / ((width - 2) * (height - 2))) / 8.3);

  return { brightness, composition, sharpness, expression: 76 };
}

function buildMetrics(raw: Metrics, category: CategoryConfig): PhotoMetrics {
  const total = clamp(
    raw.brightness * category.weights.brightness +
      raw.composition * category.weights.composition +
      raw.sharpness * category.weights.sharpness +
      raw.expression * category.weights.expression,
  );
  const interpretations = {
    brightness: band(raw.brightness, category.brightness),
    composition: band(raw.composition, category.composition),
    sharpness: band(raw.sharpness, category.sharpness),
  };
  let tip = category.tips.default;
  if (raw.sharpness < 62) tip = category.tips.sharpness;
  else if (raw.brightness < 68) tip = category.tips.brightness;
  else if (raw.composition < 68) tip = category.tips.composition;

  return {
    ...raw,
    total,
    summary: [interpretations.brightness, interpretations.composition, interpretations.sharpness, category.expression],
    detail: category.detail("", interpretations),
    tip,
    interpretations,
  };
}

export default function HomePage() {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [photos, setPhotos] = useState<Array<PhotoItem | null>>(Array(MAX_PHOTOS).fill(null));
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("profile");
  const [rankedPhotos, setRankedPhotos] = useState<RankedPhoto[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const category = CATEGORIES[selectedCategory];
  const uploadedPhotos = useMemo(
    () => photos.map((photo, slotIndex) => (photo ? { photo, slotIndex } : null)).filter(Boolean) as Array<{ photo: PhotoItem; slotIndex: number }>,
    [photos],
  );
  const recommended = rankedPhotos[0] ?? null;

  const resetResults = () => setRankedPhotos([]);

  const handleUpload = (slotIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotos((prev) => {
      const next = [...prev];
      if (next[slotIndex]) URL.revokeObjectURL(next[slotIndex]!.preview);
      next[slotIndex] = { id: `${file.name}-${file.lastModified}-${slotIndex}`, file, preview: URL.createObjectURL(file) };
      return next;
    });
    resetResults();
    event.target.value = "";
  };

  const handleRemove = (slotIndex: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      if (next[slotIndex]) URL.revokeObjectURL(next[slotIndex]!.preview);
      next[slotIndex] = null;
      return next;
    });
    resetResults();
  };

  const handleAnalyze = async () => {
    if (!uploadedPhotos.length) return;
    setIsAnalyzing(true);
    try {
      const analyzed = await Promise.all(
        uploadedPhotos.map(async ({ photo, slotIndex }) => ({
          slotIndex,
          photo,
          metrics: buildMetrics(await analyzeImage(photo.preview), category),
        })),
      );
      analyzed.sort((a, b) => {
        if (b.metrics.total !== a.metrics.total) return b.metrics.total - a.metrics.total;
        if (b.metrics.composition !== a.metrics.composition) return b.metrics.composition - a.metrics.composition;
        return b.metrics.sharpness - a.metrics.sharpness;
      });
      setRankedPhotos(analyzed);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff8fb_0%,_#fffdfd_42%,_#f8f5ff_100%)] text-slate-800">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-rose-100 bg-white/90 px-6 py-7 shadow-[0_20px_60px_rgba(236,72,153,0.08)] sm:px-8 sm:py-9">
          <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-rose-100/70 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-violet-100/70 blur-3xl" />
          <div className="relative max-w-4xl">
            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium tracking-[0.2em] text-rose-500">AI PHOTO PICKER</span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              어디에 쓸 사진인지에 맞춰
              <br />
              가장 잘 어울리는 컷을 추천해드려요
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              사진 자체만 보는 게 아니라, 어떤 용도로 쓸지까지 반영해 결과를 정리합니다. 프로필 사진부터 인스타 업로드, 소개팅 사진까지 목적에 맞게 더 설득력 있는 추천을 받아보세요.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.12fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-rose-100 bg-white p-5 shadow-[0_18px_50px_rgba(148,163,184,0.10)] sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <h2 className="text-2xl font-semibold text-slate-900">추천 기준 선택</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">사진이 어디에 쓰일지 먼저 골라주세요. 선택한 용도에 따라 추천 이유와 개선 팁이 달라집니다.</p>
                </div>
                <div className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-500">{uploadedPhotos.length}/{MAX_PHOTOS}</div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(Object.entries(CATEGORIES) as Array<[CategoryKey, CategoryConfig]>).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(key);
                      resetResults();
                    }}
                    className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                      selectedCategory === key
                        ? "border-rose-300 bg-[linear-gradient(135deg,_#fff4f7,_#f8f4ff)] shadow-[0_12px_28px_rgba(244,114,182,0.12)]"
                        : "border-slate-100 bg-white hover:border-rose-200 hover:bg-rose-50/40"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{config.label}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{config.subtitle}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-rose-100 bg-white p-4 shadow-[0_18px_50px_rgba(148,163,184,0.10)] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">비교 보드</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{category.intro}</p>
                </div>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!uploadedPhotos.length || isAnalyzing}
                  className="rounded-full bg-[linear-gradient(135deg,_#fda4af,_#c4b5fd)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(244,114,182,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAnalyzing ? "이미지 분석 중..." : "AI 추천 받기"}
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {photos.map((photo, slotIndex) => (
                  <div
                    key={slotIndex}
                    className={`overflow-hidden rounded-[1.8rem] border bg-[linear-gradient(180deg,_#fffefe,_#fff8fc)] ${
                      recommended?.slotIndex === slotIndex
                        ? "border-rose-300 shadow-[0_16px_36px_rgba(244,114,182,0.16)] ring-4 ring-rose-100"
                        : "border-rose-100 shadow-[0_12px_24px_rgba(148,163,184,0.08)]"
                    }`}
                  >
                    <input
                      ref={(node) => {
                        inputRefs.current[slotIndex] = node;
                      }}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleUpload(slotIndex, event)}
                      className="hidden"
                    />
                    {photo ? (
                      <>
                        <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
                          <img src={photo.preview} alt={`업로드한 사진 ${slotIndex + 1}`} className="h-full w-full object-cover" />
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" />
                          <div className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">사진 {slotIndex + 1}</div>
                          {recommended?.slotIndex === slotIndex ? (
                            <div className="absolute bottom-3 left-3 rounded-full bg-rose-400 px-3 py-1 text-xs font-semibold text-white shadow-sm">현재 1위 추천</div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleRemove(slotIndex)}
                            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/92 text-sm text-slate-500 shadow-sm transition hover:bg-rose-50 hover:text-rose-500"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-400">SLOT {slotIndex + 1}</p>
                            <p className="mt-1 text-sm text-slate-500">비교용 사진이 준비됐어요</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => inputRefs.current[slotIndex]?.click()}
                            className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-500 transition hover:bg-rose-50"
                          >
                            변경
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inputRefs.current[slotIndex]?.click()}
                        className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 p-6 text-center transition hover:bg-rose-50/50"
                      >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-3xl text-rose-400">+</div>
                        <div>
                          <p className="text-base font-medium text-slate-700">사진 추가</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">이 슬롯에 비교할 사진을 업로드하세요</p>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="rounded-[2rem] border border-violet-100 bg-white p-5 shadow-[0_18px_50px_rgba(148,163,184,0.10)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">추천 결과</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{category.label} 기준으로 가장 잘 어울리는 사진을 골라 이유까지 함께 정리했어요.</p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-500">Result</span>
            </div>

            {recommended ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
                  <div className="overflow-hidden rounded-[1.75rem] border border-rose-100 bg-[linear-gradient(180deg,_#fffdfd,_#fff7fb)]">
                    <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(180deg,_#fffafb,_#fff4fb)] p-4">
                      <img src={recommended.photo.preview} alt="추천 사진" className="max-h-full w-auto max-w-full rounded-[1.2rem] object-contain" />
                    </div>
                    <div className="border-t border-rose-100 px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Recommended Photo</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">총점 {recommended.metrics.total}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{category.lead} 이 사진이 가장 안정적으로 보여요.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50/60 p-5">
                      <h3 className="text-sm font-semibold text-slate-900">왜 이 사진이 1위인가요?</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{recommended.metrics.detail}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5">
                      <h3 className="text-sm font-semibold text-slate-900">평가 해석</h3>
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"><span>밝기</span><span className="font-medium text-rose-500">{shortLabel(recommended.metrics.brightness)}</span></div>
                        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"><span>구도</span><span className="font-medium text-rose-500">{recommended.metrics.composition >= 80 ? "얼굴 중심이 잘 잡힘" : recommended.metrics.composition >= 65 ? "구도가 무난함" : "중심감이 조금 약함"}</span></div>
                        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"><span>선명도</span><span className="font-medium text-rose-500">{shortLabel(recommended.metrics.sharpness)}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[1.5rem] border border-violet-100 bg-violet-50/50 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">추천 이유</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                      {recommended.metrics.summary.map((item) => (
                        <li key={item} className="rounded-2xl bg-white px-4 py-3">{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-semibold text-slate-900">개선 팁</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                      <li className="rounded-2xl bg-slate-50 px-4 py-3">{recommended.metrics.tip}</li>
                      <li className="rounded-2xl bg-slate-50 px-4 py-3">{category.subtitle}</li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-violet-100 bg-violet-50/50 p-5">
                  <h3 className="text-sm font-semibold text-slate-900">사진 순위</h3>
                  <div className="mt-4 grid gap-3">
                    {rankedPhotos.map((entry, index) => (
                      <div key={entry.photo.id} className={`rounded-2xl border px-4 py-4 ${index === 0 ? "border-rose-200 bg-white" : "border-violet-100 bg-white/80"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#fda4af,_#c4b5fd)] text-sm font-semibold text-white">{index + 1}위</div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">사진 {entry.slotIndex + 1}</p>
                              <p className="mt-1 text-xs text-slate-500">총점 {entry.metrics.total}점</p>
                            </div>
                          </div>
                          {index === 0 ? <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-500">추천</span> : null}
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                          <div className="rounded-xl bg-slate-50 px-3 py-2">밝기: {shortLabel(entry.metrics.brightness)}</div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">구도: {entry.metrics.composition >= 80 ? "좋음" : entry.metrics.composition >= 65 ? "무난" : "아쉬움"}</div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">선명도: {shortLabel(entry.metrics.sharpness)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex min-h-[36rem] items-center justify-center rounded-[1.75rem] border border-dashed border-violet-200 bg-[linear-gradient(180deg,_#fffdfd,_#f8f5ff)] p-8 text-center">
                <div className="max-w-sm">
                  <p className="text-lg font-medium text-slate-800">아직 분석 결과가 없어요</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">사진과 용도를 선택한 뒤 AI 추천 받기를 누르면, 어떤 사진이 왜 더 잘 어울리는지 서비스처럼 정리해서 보여드릴게요.</p>
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
