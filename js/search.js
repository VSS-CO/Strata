function searchDocs(q) {
  q = q.toLowerCase();
  document.querySelectorAll(".doc").forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(q)
      ? "block"
      : "none";
  });
}
