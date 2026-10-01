const addForm = document.getElementById("add-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const itemCount = document.getElementById("item-count");
const clearCompletedBtn = document.getElementById("clear-completed");
const filterBtns = document.querySelectorAll(".filter-btn");

let tasks = [];
let currentFilter = "all";

async function fetchTasks() {
  const res = await fetch("/api/tasks");
  tasks = await res.json();
  render();
}

async function addTask(text) {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const task = await res.json();
  tasks.push(task);
  render();
}

async function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: !task.completed }),
  });
  const updated = await res.json();
  Object.assign(task, updated);
  render();
}

async function deleteTask(id) {
  await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  tasks = tasks.filter((t) => t.id !== id);
  render();
}

async function clearCompleted() {
  await fetch("/api/tasks/completed", { method: "DELETE" });
  tasks = tasks.filter((t) => !t.completed);
  render();
}

function getVisibleTasks() {
  if (currentFilter === "active") return tasks.filter((t) => !t.completed);
  if (currentFilter === "completed") return tasks.filter((t) => t.completed);
  return tasks;
}

function render() {
  const visible = getVisibleTasks();
  taskList.innerHTML = "";

  if (visible.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = tasks.length === 0 ? "No tasks yet. Add one above!" : "Nothing to show here.";
    taskList.appendChild(empty);
  } else {
    for (const task of visible) {
      taskList.appendChild(renderTaskItem(task));
    }
  }

  const activeCount = tasks.filter((t) => !t.completed).length;
  itemCount.textContent = `${activeCount} item${activeCount === 1 ? "" : "s"} left`;
}

function renderTaskItem(task) {
  const li = document.createElement("li");
  li.className = "task-item" + (task.completed ? " completed" : "");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const span = document.createElement("span");
  span.className = "task-text";
  span.textContent = task.text;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "✕";
  deleteBtn.setAttribute("aria-label", "Delete task");
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  li.append(checkbox, span, deleteBtn);
  return li;
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  addTask(text);
  taskInput.value = "";
  taskInput.focus();
});

clearCompletedBtn.addEventListener("click", clearCompleted);

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

fetchTasks();
