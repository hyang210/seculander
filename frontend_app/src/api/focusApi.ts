// src/api/focusApi.ts
import { Platform } from 'react-native';

// 백엔드 주소 설정 (이 부분이 없어서 에러가 났던 것입니다!)
const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

// 서버에서 집중도 데이터를 받아와서 0~23시의 점수 배열로 변환
export const fetchFocusData = async (date: string): Promise<number[]> => {
  // 임시 테스트용 ID
  const userId = 'test-user-01'; 
  
  try {
    const response = await fetch(`${BASE_URL}/api/focus/score/${userId}`);
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json(); 
    // { focusScores: { "09:00-10:00": 95, ... } }

    const scoresArray: number[] = new Array(24).fill(50); // 기본값 50

    if (data.focusScores) {
      for (let hour = 0; hour < 24; hour++) {
        const current = String(hour).padStart(2, '0');
        const next = String((hour + 1) % 24).padStart(2, '0');
        const key = `${current}:00-${next}:00`; 

        if (data.focusScores[key] !== undefined) {
          scoresArray[hour] = data.focusScores[key];
        }
      }
    }
    return scoresArray;

  } catch (error) {
    console.error('AI Model Fetch Error:', error);
    return new Array(24).fill(50);
  }
};