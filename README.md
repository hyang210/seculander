# Seculander
AI 기반 개인 맞춤 집중도 캘린더
(Node.js + Express + MongoDB + Redis + React Native + Docker + ML-kmenas)
Seculander은 단순한 일정 관리 앱이 아니라
사용자의 집중 패턴을 분석하여 업무에 필요한 집중도에 따라
자동으로 최적 시간대에 업무를 배치해주는 AI 기반 캘린더 입니다.

주요 기능
기능 1: 집중도 기반 Focus Slotting
- 사용자의 과거 패턴 기반으로 시간대별 집중도 예측
- ml-kmeans + EMA smoothing을 적용한 머신러닝 모델 사용

기능 2 : Snooze시 자동 재배치
- 사용자가 특정 업무를 미루기 하면 AI가 이전 집중도 예측 결과 + 현재 캘린더 빈 시간대를 기반으로 업무를 자동으로 다음 최적 시간으로 배치
<재배치 조건 : 기존 시작 시간 이후여야 함, slot의 길이가 task duration보다 길어야 함, slot의  focusScroe >= requiredScroe>

기능 3 : 태스트 배치 및 타임라인 생성
사용자의 집중 패턴 기반으로 자동 생성된 최적 시간대를 시각적으로 배치하여 일정 타임라인을 구성 

실행 방법
1. 사전준비
   Node.js + npm + Docker & Docker compose + Android Studio(Emulator) + Git
2. Backend(API 서버) 실행방법
   docker compose up --build (프로젝트 최상위 폴더에서 명령어 실행)
   => api + mongo + redis + mongo-express 의 컨테이너들이 자동으로 올라옴
3. Frontend(React-native app) 실행방법
   cd frontend
   npm install (의존성 설치)
   npx react-native start --port=8088
   Android Emulator 실행
   새로운 터미널 열고
   cd frontend
   npx react-native run-android --port=8088
5. 종료 방법
   docker compose down

개발자 소개
김은진 : 집중도 기반 Focus Slotting 기능 개발
류채현 : Snooze시 자동 재배치 기능 개발
정헌재 : 태스트 배치 및 타임라인 생성 기능 개발
조채명 : React Native UI/UX 개발

