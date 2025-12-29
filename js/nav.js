const root = document.documentElement;

function toggleTheme() {
  root.classList.toggle("dark");
  localStorage.setItem("theme", root.classList.contains("dark") ? "dark" : "light");
}

if (localStorage.getItem("theme") === "dark") {
  root.classList.add("dark");
}
