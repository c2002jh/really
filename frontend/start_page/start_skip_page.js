document.addEventListener("DOMContentLoaded", () => {
  // 1) start_name_page에서 닉네임 읽어서 OO님에 넣기
  (function () {
    const span = document.getElementById("nickname-placeholder");
    if (!span) return;

    let name = "";

    const params = new URLSearchParams(window.location.search);
    if (params.get("name")) {
      name = params.get("name").trim();
    }

    if (!name) {
      try {
        name = sessionStorage.getItem("neurotuneNickname") || "";
      } catch (e) {}
    }

    if (name) span.textContent = name;
  })();

  // 공통 요소들 한번에 가져오기
  const cards = document.querySelectorAll(".genre-card");
  const scrollArea = document.querySelector(".genre-scroll");
  const backIcon = document.querySelector(".back-icon");
  const skipBtn = document.querySelector(".skip-btn");
  const rightIcon = document.querySelector(".right-double-icon");

  // 장르 선택 상태 & 화살표 상태
  let arrowShown = false;
  let selectedGenres = [];

  function showArrowAndShift() {
    if (arrowShown) return;
    arrowShown = true;

    if (rightIcon) rightIcon.classList.add("show");
    if (scrollArea) scrollArea.classList.add("shift-left");
  }

  // 2) 장르 선택: 제한 없이 선택/해제 + 선택 0개면 원상복구
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const genre = card.textContent.trim();

      // 이미 선택된 장르 → 해제
      if (selectedGenres.includes(genre)) {
        selectedGenres = selectedGenres.filter((g) => g !== genre);
        card.classList.remove("selected");

        // 선택된 장르가 0개가 되면 → 아이콘/이동 원상복구
        if (selectedGenres.length === 0) {
          if (rightIcon) rightIcon.classList.remove("show");
          if (scrollArea) scrollArea.classList.remove("shift-left");
          arrowShown = false;
        }
        return;
      }

      // 새로 선택되는 장르
      selectedGenres.push(genre);
      card.classList.add("selected");

      // 첫 선택일 때만 화살표 + 이동 실행
      showArrowAndShift();
    });
  });

  // 3) 왼쪽 상단 back_icon → start_heavyuser_page로 이동
  if (backIcon) {
    backIcon.addEventListener("click", () => {
      window.location.href = "start_heavyuser_page.html";
    });
  }

  // 4) 하단 skip 버튼 → brain_file_page로 이동
  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      window.location.href = "brain_file_page.html";
    });
  }

  // 5) 오른쪽 화살표 아이콘 → brain_file_page로 이동
  if (rightIcon) {
    rightIcon.addEventListener("click", () => {
      window.location.href = "brain_file_page.html";
    });
  }
});
