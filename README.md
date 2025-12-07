# FrontEnd

# Team2-FrontEnd

## 기술 스택

* HTML5
* CSS3
* JavaScript (ES6+)

#

## 파일 구조
```

```

#

## Commit Message Convention

| Tag        | Description        |
| ---------- | ------------------ |
| feat       | 새로운 UI/기능 추가       |
| fix        | UI/기능 버그 수정        |
| style      | 스타일 변경 (CSS 수정 등)  |
| layout     | 레이아웃 수정 (구조/정렬 관련) |
| refactor   | 코드 리팩토링 (기능 변화 없음) |
| docs       | 문서 추가, 수정, 삭제      |
| test       | 테스트 코드 추가/수정/삭제    |
| ci         | CI 관련 설정 변경        |
| chore      | 기타 변경사항            |
| remove     | 파일/코드 삭제           |

#

### Commit 예시

```
feat: 메인 배너 컴포넌트 구현  
fix: 모바일에서 버튼 클릭 안 되던 문제 수정  
style: 폰트 사이즈 조정 및 마진 수정  
responsive: 태블릿 뷰 대응 레이아웃 적용  
```

#

## 브랜치 전략

```
main     → 배포용 (최종 안정 버전)
dev      → 개발 통합 브랜치
feat/이름 → 기능 단위 개발 브랜치
fix/이름     → 버그 수정 브랜치
```

### 브랜치 전략 예시

```
feat/login-page
fix/login-page
```

* **작업 흐름**
  * dev 브랜치에서 자신의 feat/ 또는 fix/ 브랜치를 생성
  * 작업 후 dev로 PR 생성
  * 코드 리뷰 및 테스트 후 main으로 병합 (릴리즈 시점)

<br />

## Pull Request 규칙

* 제목 형식: `[태그] 작업 제목`
  예시: `[feat] 로그인 폼 컴포넌트 구현`

* PR 설명:

  * **작업 내용**: 주요 변경사항 설명
  * **스크린샷**: UI 변경이 있을 경우 이미지 첨부
  * **주의사항**: 테스트 또는 확인 필요한 부분 기재

* 최소 1인 이상 **리뷰 승인 후 병합**

<br />

## 💻 코드 컨벤션

* **HTML**

  * 들여쓰기 2칸
  * 시맨틱 태그 사용 권장 (`<section>`, `<article>` 등)

* **CSS**

  * 클래스명은 **kebab-case** 사용 (예: `.main-banner`)
  * 공통 스타일은 `common.css` 또는 `variables.css`로 분리
  * 미디어 쿼리는 하단에 정리

* **JavaScript**

  * ES6+ 문법 사용 (let/const, 화살표 함수 등)
  * 함수명, 변수명은 **camelCase**
  * 모듈화 필요 시 기능 단위로 파일 분리
