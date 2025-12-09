// START 버튼 클릭 시 start_lightuser_page_2로 이동
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.querySelector(".start-button");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      window.location.href = "start_lightuser_page_2.html";
    });
  }
});
