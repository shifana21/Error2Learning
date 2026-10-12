
/* ==========================================
   Error2Learning - Application Logic
   HTML + CSS + Vanilla JavaScript
   ========================================== */

"use strict";

// ---------- DOM ELEMENTS ----------

const errorGrid = document.getElementById("errorGrid");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyMessage = document.getElementById("emptyMessage");

const errorDialog = document.getElementById("errorDialog");
const errorForm = document.getElementById("errorForm");

const addErrorBtn = document.getElementById("addErrorBtn");
const emptyAddBtn = document.getElementById("emptyAddBtn");
const closeDialogBtn = document.getElementById("closeDialogBtn");
const cancelDialogBtn = document.getElementById("cancelDialogBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const searchInput = document.getElementById("searchInput");
const languageFilter = document.getElementById("languageFilter");
const sortFilter = document.getElementById("sortFilter");

const totalErrorsElement = document.getElementById("totalErrors");
const favoriteErrorsElement = document.getElementById("favoriteErrors");
const languageCountElement = document.getElementById("languageCount");
const navTotalElement = document.getElementById("navTotal");
const resultsCountElement = document.getElementById("resultsCount");
const libraryTitle = document.getElementById("libraryTitle");

const dialogTitle = document.getElementById("dialogTitle");
const saveErrorBtn = document.getElementById("saveErrorBtn");
const toast = document.getElementById("toast");

// ---------- STORAGE ----------

const STORAGE_KEY = "error2learning_entries_v1";

let errors = loadErrors();
let currentView = "all";
let selectedLanguage = "All";
let toastTimeout;

// Read entries safely from LocalStorage.
function loadErrors() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    // Ignore malformed entries rather than breaking the app.
    return parsed.filter((entry) =>
      entry &&
      typeof entry.id === "string" &&
      typeof entry.title === "string" &&
      typeof entry.solution === "string"
    );
  } catch (error) {
    console.error("Could not load saved entries:", error);
    return [];
  }
}

// Save the entire error library.
function persistErrors() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
    return true;
  } catch (error) {
    console.error("Could not save entries:", error);

    showToast(
      "Could not save. Check your browser storage space and settings."
    );

    return false;
  }
}

// ---------- HELPERS ----------

// Generate unique IDs without external libraries.
function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

// Escape user-provided text before inserting it into HTML.
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function formatDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function normalizeLanguage(language) {
  const supported = [
    "Python",
    "Java",
    "JavaScript",
    "SQL",
    "Other"
  ];

  return supported.includes(language) ? language : "Other";
}

function showToast(message) {
  clearTimeout(toastTimeout);

  toast.textContent = message;
  toast.classList.add("show");

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

// ---------- DASHBOARD STATISTICS ----------

function updateStatistics() {
  const favorites = errors.filter((entry) => entry.favorite);

  const languages = new Set(
    errors.map((entry) => normalizeLanguage(entry.language))
  );

  totalErrorsElement.textContent = errors.length;
  favoriteErrorsElement.textContent = favorites.length;
  languageCountElement.textContent = languages.size;
  navTotalElement.textContent = errors.length;
}

// ---------- SEARCH AND FILTER ----------

function getFilteredErrors() {
  const query = searchInput.value.trim().toLowerCase();
  const language = languageFilter.value;
  const sort = sortFilter.value;

  let result = errors.filter((entry) => {
    const matchesView =
      currentView !== "favorites" || entry.favorite;

    const matchesLanguage =
      selectedLanguage === "All" ||
      normalizeLanguage(entry.language) === selectedLanguage;

    const matchesDropdown =
      language === "All" ||
      normalizeLanguage(entry.language) === language;

    const searchableText = [
      entry.title,
      entry.language,
      entry.framework,
      entry.message,
      entry.cause,
      entry.solution,
      entry.tags,
      entry.notes
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(query);

    return (
      matchesView &&
      matchesLanguage &&
      matchesDropdown &&
      matchesSearch
    );
  });

  result.sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }

    if (sort === "az") {
      return a.title.localeCompare(b.title);
    }

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return result;
}

// ---------- RENDER ERROR CARDS ----------

function renderErrors() {
  updateStatistics();

  const filteredErrors = getFilteredErrors();

  resultsCountElement.textContent =
    `${filteredErrors.length} ${
      filteredErrors.length === 1 ? "entry" : "entries"
    }`;

  libraryTitle.textContent =
    currentView === "favorites"
      ? "Your Favorite Fixes"
      : selectedLanguage !== "All"
        ? `${selectedLanguage} Errors`
        : "Your Error Library";

  errorGrid.innerHTML = "";

  emptyState.hidden = filteredErrors.length > 0;
  errorGrid.hidden = filteredErrors.length === 0;

  if (filteredErrors.length === 0) {
    const hasEntries = errors.length > 0;

    emptyTitle.textContent = hasEntries
      ? "No matching errors found"
      : "Your library is ready to grow";

    emptyMessage.textContent = hasEntries
      ? "Try another search, change your filters, or clear them."
      : "Save your first programming error and its solution.";

    emptyAddBtn.hidden = hasEntries;
    return;
  }

  errorGrid.innerHTML = filteredErrors
    .map(createErrorCard)
    .join("");
}

function createErrorCard(entry) {
  const language = normalizeLanguage(entry.language);
  const languageClass = language.toLowerCase().replace(/\s+/g, "");

  const tags = Array.isArray(entry.tags)
    ? entry.tags
    : [];

  const safeTags = tags
    .filter((tag) => typeof tag === "string" && tag.trim())
    .map((tag) =>
      `<span class="tag">${escapeHTML(tag)}</span>`
    )
    .join("");

  const framework = entry.framework
    ? escapeHTML(entry.framework)
    : "General programming";

  return `
    <article class="error-card" data-id="${escapeHTML(entry.id)}">

      <div class="card-top">
        <span class="language-badge ${languageClass}">
          ${escapeHTML(language)}
        </span>

        <div class="card-tools">
          <button
            type="button"
            class="icon-button favorite-button ${entry.favorite ? "is-favorite" : ""}"
            data-action="favorite"
            data-id="${escapeHTML(entry.id)}"
            aria-label="${entry.favorite ? "Remove from" : "Add to"} favorites"
            aria-pressed="${Boolean(entry.favorite)}"
            title="${entry.favorite ? "Remove favorite" : "Add favorite"}"
          >${entry.favorite ? "★" : "☆"}</button>

          <button
            type="button"
            class="icon-button"
            data-action="edit"
            data-id="${escapeHTML(entry.id)}"
            aria-label="Edit ${escapeHTML(entry.title)}"
            title="Edit error"
          >✎</button>

          <button
            type="button"
            class="icon-button"
            data-action="delete"
            data-id="${escapeHTML(entry.id)}"
            aria-label="Delete ${escapeHTML(entry.title)}"
            title="Delete error"
          >×</button>
        </div>
      </div>

      <h3>${escapeHTML(entry.title)}</h3>
      <p class="framework-label">${framework}</p>

      <p class="eyebrow">ERROR MESSAGE</p>
      <pre class="error-preview">${escapeHTML(entry.message)}</pre>

      <p class="card-cause">
        <strong>Cause:</strong> ${escapeHTML(entry.cause)}
      </p>

      <p class="eyebrow">WORKING SOLUTION</p>
      <pre class="solution-preview">${escapeHTML(entry.solution)}</pre>

      <div class="card-tags">${safeTags}</div>

      <div class="card-meta">
        <span>Saved ${escapeHTML(formatDate(entry.createdAt))}</span>
      </div>

      <div class="card-actions">
        <button
          type="button"
          class="copy-button"
          data-action="copy"
          data-id="${escapeHTML(entry.id)}"
        >▣ Copy Solution</button>

        <button
          type="button"
          data-action="details"
          data-id="${escapeHTML(entry.id)}"
        >View Details</button>
      </div>
    </article>
  `;
}

// ---------- ADD AND EDIT ERRORS ----------

function openNewErrorDialog() {
  errorForm.reset();

  document.getElementById("errorId").value = "";
  dialogTitle.textContent = "Save a New Error";
  saveErrorBtn.textContent = "Save Error";

  errorDialog.showModal();
  document.getElementById("errorTitle").focus();
}

function openEditErrorDialog(id) {
  const entry = errors.find((item) => item.id === id);

  if (!entry) {
    showToast("This error could not be found.");
    return;
  }

  errorForm.reset();

  document.getElementById("errorId").value = entry.id;
  document.getElementById("errorTitle").value = entry.title;
  document.getElementById("errorLanguage").value =
    normalizeLanguage(entry.language);
  document.getElementById("errorFramework").value =
    entry.framework || "";
  document.getElementById("errorMessage").value =
    entry.message || "";
  document.getElementById("errorCause").value =
    entry.cause || "";
  document.getElementById("errorSolution").value =
    entry.solution || "";
  document.getElementById("errorTags").value =
    Array.isArray(entry.tags) ? entry.tags.join(", ") : "";
  document.getElementById("errorNotes").value =
    entry.notes || "";

  dialogTitle.textContent = "Edit Error";
  saveErrorBtn.textContent = "Update Error";

  errorDialog.showModal();
  document.getElementById("errorTitle").focus();
}

errorForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const id = document.getElementById("errorId").value;

  const title = document.getElementById("errorTitle")
    .value.trim();

  const language = document.getElementById("errorLanguage")
    .value;

  const framework = document.getElementById("errorFramework")
    .value.trim();

  const message = document.getElementById("errorMessage")
    .value.trim();

  const cause = document.getElementById("errorCause")
    .value.trim();

  const solution = document.getElementById("errorSolution")
    .value.trim();

  const tags = document.getElementById("errorTags")
    .value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const notes = document.getElementById("errorNotes")
    .value.trim();

  if (!title || !language || !message || !cause || !solution) {
    showToast("Please complete all required fields.");
    return;
  }

  const existingEntry = id
    ? errors.find((entry) => entry.id === id)
    : null;

  const entry = {
    id: existingEntry ? existingEntry.id : createId(),
    title,
    language: normalizeLanguage(language),
    framework,
    message,
    cause,
    solution,
    tags,
    notes,
    favorite: existingEntry ? existingEntry.favorite : false,
    createdAt: existingEntry ? existingEntry.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const previousErrors = errors;

  if (existingEntry) {
    errors = errors.map((item) =>
      item.id === id ? entry : item
    );
  } else {
    errors = [entry, ...errors];
  }

  if (!persistErrors()) {
    errors = previousErrors;
    return;
  }

  errorDialog.close();
  renderErrors();

  showToast(
    existingEntry
      ? "Error updated successfully!"
      : "Error saved successfully!"
  );
});

// ---------- DELETE ERRORS ----------

function deleteError(id) {
  const entry = errors.find((item) => item.id === id);

  if (!entry) {
    showToast("This error could not be found.");
    return;
  }

  const confirmed = window.confirm(
    `Delete "${entry.title}"? This action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  const previousErrors = errors;
  errors = errors.filter((item) => item.id !== id);

  if (!persistErrors()) {
    errors = previousErrors;
    return;
  }

  renderErrors();
  showToast("Error deleted.");
}

// ---------- FAVORITES ----------

function toggleFavorite(id) {
  const previousErrors = errors;

  errors = errors.map((entry) =>
    entry.id === id
      ? { ...entry, favorite: !entry.favorite }
      : entry
  );

  if (!persistErrors()) {
    errors = previousErrors;
    return;
  }

  renderErrors();
  showToast("Favorite status updated.");
}

// ---------- COPY SOLUTION ----------

async function copySolution(id) {
  const entry = errors.find((item) => item.id === id);

  if (!entry) {
    showToast("Solution not found.");
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(entry.solution);
    } else {
      // Fallback for local development in older browsers.
      const temporary = document.createElement("textarea");

      temporary.value = entry.solution;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";

      document.body.appendChild(temporary);
      temporary.select();

      const copied = document.execCommand("copy");
      temporary.remove();

      if (!copied) {
        throw new Error("Clipboard copy failed");
      }
    }

    showToast("Solution copied to clipboard!");
  } catch (error) {
    console.error("Copy failed:", error);
    showToast("Copy failed. Select and copy the solution manually.");
  }
}

// ---------- VIEW DETAILS ----------

function viewDetails(id) {
  const entry = errors.find((item) => item.id === id);

  if (!entry) {
    showToast("This error could not be found.");
    return;
  }

  const details = [
    `TITLE: ${entry.title}`,
    `LANGUAGE: ${entry.language}`,
    `FRAMEWORK / TOOL: ${entry.framework || "Not specified"}`,
    "",
    "ERROR MESSAGE:",
    entry.message,
    "",
    "CAUSE:",
    entry.cause,
    "",
    "SOLUTION:",
    entry.solution,
    "",
    `TAGS: ${(entry.tags || []).join(", ") || "None"}`,
    "",
    "EXTRA NOTES:",
    entry.notes || "None",
    "",
    `CREATED: ${formatDate(entry.createdAt)}`,
    `UPDATED: ${formatDate(entry.updatedAt || entry.createdAt)}`
  ].join("\n");

  window.alert(details);
}

// ---------- EVENT LISTENERS ----------

addErrorBtn.addEventListener("click", openNewErrorDialog);
emptyAddBtn.addEventListener("click", openNewErrorDialog);

closeDialogBtn.addEventListener("click", () => {
  errorDialog.close();
});

cancelDialogBtn.addEventListener("click", () => {
  errorDialog.close();
});

// Close the dialog when the user clicks its backdrop.
errorDialog.addEventListener("click", (event) => {
  if (event.target === errorDialog) {
    errorDialog.close();
  }
});

searchInput.addEventListener("input", renderErrors);
languageFilter.addEventListener("change", renderErrors);
sortFilter.addEventListener("change", renderErrors);

clearFiltersBtn.addEventListener("click", () => {
  searchInput.value = "";
  languageFilter.value = "All";
  sortFilter.value = "newest";
  selectedLanguage = "All";
  currentView = "all";

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.remove("active");
  });

  document.querySelector('[data-view="all"]').classList.add("active");

  renderErrors();
  showToast("Filters cleared.");
});

// Handle all error-card actions through event delegation.
errorGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "favorite") {
    toggleFavorite(id);
  } else if (action === "edit") {
    openEditErrorDialog(id);
  } else if (action === "delete") {
    deleteError(id);
  } else if (action === "copy") {
    copySolution(id);
  } else if (action === "details") {
    viewDetails(id);
  }
});

// Sidebar navigation.
document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    if (button.dataset.view) {
      currentView = button.dataset.view;
      selectedLanguage = "All";
      languageFilter.value = "All";
    } else if (button.dataset.language) {
      currentView = "all";
      selectedLanguage = button.dataset.language;
      languageFilter.value = button.dataset.language;
    }

    renderErrors();
  });
});

// ---------- INITIALIZE APPLICATION ----------

renderErrors();

console.log("Error2Learning initialized successfully.");
