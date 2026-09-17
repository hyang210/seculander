// src/utils/categoryHelper.ts
import { CalendarEvent, Category } from '../types'; // types 경로에 맞춰 수정

// 분석에서 제외할 불용어 (너무 흔한 단어들)
const STOP_WORDS = new Set([
  'with', 'at', 'the', 'and', 'for', 'to', 'in', 'on', 'of', 'a', 
  'meeting', 'todo', 'task', // 이런 일반적인 단어도 제외 가능
  '할일', '미팅', '약속' // 한글 불용어 예시
]);

/**
 * 이벤트 제목들을 분석하여 새로운 카테고리 후보를 추천함
 * @param events 전체 이벤트 목록
 * @param currentCategories 현재 존재하는 카테고리 목록
 * @param threshold 최소 반복 횟수 (기본 3회)
 */
export const suggestNewCategories = (
  events: CalendarEvent[], 
  currentCategories: Category[],
  threshold: number = 3
): string[] => {
  const wordCount: Record<string, number> = {};

  events.forEach(event => {
    // 1. 제목을 공백 기준으로 쪼갬 & 소문자 변환 & 특수문자 제거
    const words = event.title
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, '') // 특수문자 제거 (한글,영문,숫자만 남김)
      .split(/\s+/);

    words.forEach(word => {
      // 2. 글자수가 2자 이상이고, 불용어가 아닌 경우만 카운트
      if (word.length >= 2 && !STOP_WORDS.has(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
  });

  // 3. 빈도수가 threshold 이상이고, 현재 카테고리에 없는 단어만 추출
  const suggestions = Object.keys(wordCount).filter(word => {
    // 이미 존재하는 카테고리인지 확인 (대소문자 무시 비교)
    const exists = currentCategories.some(cat => cat.toLowerCase() === word);
    return wordCount[word] >= threshold && !exists;
  });

  // 4. 첫 글자를 대문자로 변환하여 반환 (예: "study" -> "Study")
  return suggestions.map(s => s.charAt(0).toUpperCase() + s.slice(1));
};