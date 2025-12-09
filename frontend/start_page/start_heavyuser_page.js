const params = new URLSearchParams(window.location.search);
const nickname = params.get("nickname");

// 닉네임이 있으면 OO 자리에 삽입
const nicknamePlaceholder = document.getElementById("nickname-placeholder");
if (nickname && nicknamePlaceholder) {
  nicknamePlaceholder.textContent = nickname;
}

const cards = document.querySelectorAll(".genre-card");
let selectedGenres = [];
let arrowShown = false;

// 화살표 + shift-left 주는 함수
function showArrowAndShift() {
  if (arrowShown) return;
  arrowShown = true;

  document.querySelector(".right-double-icon").classList.add("show");
  document.querySelector(".genre-scroll").classList.add("shift-left");
}

cards.forEach((card) => {
  card.addEventListener("click", () => {
    // 클릭하면 바로 arrow 관련 체크
    showArrowAndShift();

    const genre = card.textContent.trim();

    // -----------------------------
    // 선택 해제 구간
    // -----------------------------
    if (selectedGenres.includes(genre)) {
      selectedGenres = selectedGenres.filter((g) => g !== genre);
      card.classList.remove("selected");

      // ★★★ 선택된 장르가 0개면 원상태로 복귀
      if (selectedGenres.length === 0) {
        document.querySelector(".right-double-icon").classList.remove("show");
        document.querySelector(".genre-scroll").classList.remove("shift-left");
        arrowShown = false; // 다시 작동하도록 초기화
      }

      return;
    }

    // -----------------------------
    // 3개 선택되어 있는 상태에서 추가 선택 → 빨간색 깜빡임
    // -----------------------------
    if (selectedGenres.length >= 3) {
      const selectedCards = document.querySelectorAll(".genre-card.selected");

      selectedCards.forEach((c) => c.classList.add("error"));

      setTimeout(() => {
        selectedCards.forEach((c) => c.classList.remove("error"));
      }, 500);

      return;
    }

    // -----------------------------
    // 정상 선택
    // -----------------------------
    selectedGenres.push(genre);
    card.classList.add("selected");
  });

  // "장르를 모르겠어요" 버튼 → start_lightuser_page로 이동
  const dontKnowBtn = document.querySelector(".dont-know-btn");
  if (dontKnowBtn) {
    dontKnowBtn.addEventListener("click", () => {
      window.location.href = "start_lightuser_page.html"; // 파일 이름에 맞게!
    });
  }

  // 오른쪽 더블 화살표 아이콘 → start_skip_page로 이동
  const rightIcon = document.querySelector(".right-double-icon");
  if (rightIcon) {
    rightIcon.addEventListener("click", () => {
      window.location.href = "start_skip_page.html"; // 실제 파일 이름에 맞게!
    });
  }
});
