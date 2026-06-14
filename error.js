// error.js
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const message = params.get("message") || "An unexpected error occurred.";
  document.getElementById("errorMessage").textContent = message;
});
