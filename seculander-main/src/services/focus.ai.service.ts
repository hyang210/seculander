// src/services/focus.ai.service.ts
import fs from 'fs-extra';
import kmeans from 'ml-kmeans';

type HourlyPoint = { hour: number; focus: number }; 

const DATA_DIR  = process.env.DATA_DIR  || './data/training';
const MODEL_DIR = process.env.MODEL_DIR || './data/models';

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function blockLabel(h: number) {
  const nxt = (h + 1) % 24;
  const pad = (x: number) => x.toString().padStart(2, '0');
  return `${pad(h)}:00-${pad(nxt)}:00`;
}

/** 간단한 지수이동평균(EMA) smoothing */
function ema(series: number[], alpha = 0.3): number[] {
  if (series.length === 0) return [];
  const out: number[] = [];
  for (let i = 0; i < series.length; i++) {
    if (i === 0) out.push(series[0]);
    else out.push(alpha * series[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

export class FocusAIService {
  constructor() {
    fs.ensureDirSync(DATA_DIR);
    fs.ensureDirSync(MODEL_DIR);
  }

  /** 유저 데이터 경로 */
  private userDataPath(userId: string) {
    return `${DATA_DIR}/${userId}.json`;
  }

  /**
   * 24시간 기본 포커스 점수(0~100)
   * - ML: ml-kmeans로 집중 구간 보정
   * - 데이터 없으면 기본 패턴 사용
   */
  private buildHourlySeries(userId: string): HourlyPoint[] {
    const path = this.userDataPath(userId);
    let points: HourlyPoint[] = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      focus: 60,
    }));

    if (!fs.existsSync(path)) {
      // 기본 패턴
      [9, 10, 11].forEach((h) => (points[h].focus = 85));
      [14, 15, 16].forEach((h) => (points[h].focus = 72));
      [20, 21, 22].forEach((h) => (points[h].focus = 55));
      return points;
    }

    // 스누즈 기록을 사용하지 않으므로 단순히 기본값 유지
    const payload = fs.readJSONSync(path);
    const fb = payload.feedback || [];
    if (fb.length === 0) return points;

    // k-means로 집중 높은 구간 보정
    const data = points.map((p) => [p.hour, p.focus]);

    try {
      const k = 2;
      const km: any = kmeans(data, k, {
        initialization: 'kmeans++',
        maxIterations: 50,
      });

      const clusters: number[] = km?.clusters ?? [];
      const cents: any[] = km?.centroids ?? [];

      const means = cents
        .map((c) =>
          Array.isArray(c?.centroid) ? c.centroid[1] : undefined
        )
        .filter((v: any) => typeof v === 'number') as number[];

      const bestIdx = means.length
        ? means.indexOf(Math.max(...means))
        : -1;

      points = points.map((p, i) =>
        bestIdx >= 0 && clusters[i] === bestIdx
          ? { ...p, focus: clamp(p.focus + 8) }
          : p,
      );
    } catch {}

    return points;
  }

  /**
   * 24시간 포커스 점수 테이블 반환
   * - ML + 휴리스틱 + EMA smoothing
   */
  async predictFocusTable(userId: string): Promise<Record<string, number>> {
    const base = this.buildHourlySeries(userId);
    const series = base.map((p) => p.focus);

    const smoothed = ema(series, 0.3);
    const smoothed2 = ema(smoothed, 0.3);

    const table: Record<string, number> = {};
    smoothed2.forEach((v, h) => {
      table[blockLabel(h)] = Math.round(clamp(v));
    });

    return table;
  }
}

export const focusAIService = new FocusAIService();
