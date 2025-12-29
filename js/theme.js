const root = document.documentElement;
const saved = localStorage.getItem("theme");

if (saved) root.dataset.theme = saved;

function toggleTheme() {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  localStorage.setItem("theme", next);
}
