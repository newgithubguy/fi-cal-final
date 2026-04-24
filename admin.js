const API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:3000/api" : "/api";

const createUserForm = document.getElementById("createUserForm");
const newUsernameInput = document.getElementById("newUsername");
const newPasswordInput = document.getElementById("newPassword");
const newIsAdminInput = document.getElementById("newIsAdmin");
const usersTableBody = document.getElementById("usersTableBody");
const adminMessage = document.getElementById("adminMessage");
const refreshUsersBtn = document.getElementById("refreshUsersBtn");
const adminUsernameDisplay = document.getElementById("adminUsernameDisplay");

function setMessage(message, type = "info") {
  adminMessage.textContent = message;
  adminMessage.dataset.type = type;
}

function formatCreatedAt(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function buildUserRow(user) {
  const row = document.createElement("tr");

  const userCell = document.createElement("td");
  userCell.innerHTML = `
    <div class="admin-user-name">${user.username}</div>
    ${user.isCurrentUser ? '<div class="admin-user-meta">Current session</div>' : ""}
  `;
  row.appendChild(userCell);

  const roleCell = document.createElement("td");
  roleCell.innerHTML = `
    <label class="admin-toggle ${user.isCurrentUser ? 'is-locked' : ''}">
      <input type="checkbox" ${user.isAdmin ? "checked" : ""} ${user.isCurrentUser ? "disabled" : ""} data-action="toggle-admin" data-user-id="${user.id}" />
      <span>${user.isAdmin ? "Admin" : "Standard"}</span>
    </label>
  `;
  row.appendChild(roleCell);

  const createdCell = document.createElement("td");
  createdCell.textContent = formatCreatedAt(user.createdAt);
  row.appendChild(createdCell);

  const dataCell = document.createElement("td");
  dataCell.textContent = `${user.accountCount} accounts, ${user.transactionCount} transactions`;
  row.appendChild(dataCell);

  const actionsCell = document.createElement("td");
  actionsCell.innerHTML = `
    <div class="admin-actions">
      <button type="button" class="back-link admin-action-btn" data-action="reset-password" data-user-id="${user.id}" data-username="${user.username}">Reset password</button>
      <button type="button" class="admin-delete-btn" data-action="delete-user" data-user-id="${user.id}" data-username="${user.username}" ${user.isCurrentUser ? "disabled" : ""}>Delete</button>
    </div>
  `;
  row.appendChild(actionsCell);

  return row;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

async function loadUsers() {
  usersTableBody.innerHTML = '<tr><td colspan="5" class="admin-empty">Loading users...</td></tr>';

  try {
    const { users } = await apiRequest("/admin/users");

    if (!users.length) {
      usersTableBody.innerHTML = '<tr><td colspan="5" class="admin-empty">No users found.</td></tr>';
      return;
    }

    usersTableBody.innerHTML = "";
    users.forEach((user) => {
      usersTableBody.appendChild(buildUserRow(user));
    });
  } catch (error) {
    usersTableBody.innerHTML = `<tr><td colspan="5" class="admin-empty">${error.message}</td></tr>`;
    setMessage(error.message, "error");
  }
}

async function checkAdminAccess() {
  try {
    const auth = await apiRequest("/auth/status", { method: "GET" });
    if (!auth.authenticated) {
      window.location.href = "/login.html";
      return false;
    }

    if (!auth.isAdmin) {
      window.location.href = "/index.html";
      return false;
    }

    adminUsernameDisplay.textContent = `Logged in as: ${auth.username}`;
    return true;
  } catch {
    window.location.href = "/login.html";
    return false;
  }
}

createUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = newUsernameInput.value.trim();
  const password = newPasswordInput.value;
  const isAdmin = newIsAdminInput.checked;

  if (!username || !password) {
    setMessage("Username and password are required.", "error");
    return;
  }

  try {
    await apiRequest("/admin/users", {
      method: "POST",
      body: JSON.stringify({ username, password, isAdmin })
    });

    createUserForm.reset();
    setMessage(`Created user ${username}.`, "success");
    await loadUsers();
  } catch (error) {
    setMessage(error.message, "error");
  }
});

refreshUsersBtn.addEventListener("click", async () => {
  setMessage("Refreshing users...");
  await loadUsers();
  setMessage("User list refreshed.", "success");
});

usersTableBody.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  const userId = target.dataset.userId;
  const username = target.dataset.username;

  if (!action || !userId) {
    return;
  }

  if (action === "reset-password") {
    const nextPassword = window.prompt(`Enter a new password for ${username}:`);
    if (nextPassword === null) {
      return;
    }

    const normalizedPassword = nextPassword.trim();
    if (normalizedPassword.length < 4) {
      setMessage("Password must be at least 4 characters (excluding spaces).", "error");
      return;
    }

    const confirmPassword = window.prompt(`Re-enter the new password for ${username}:`);
    if (confirmPassword === null) {
      return;
    }

    if (confirmPassword.trim() !== normalizedPassword) {
      setMessage("Passwords did not match. Password was not changed.", "error");
      return;
    }

    try {
      await apiRequest(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ password: normalizedPassword })
      });
      setMessage(`Password updated for ${username}.`, "success");
    } catch (error) {
      setMessage(error.message, "error");
    }
    return;
  }

  if (action === "delete-user") {
    const confirmed = window.confirm(`Delete ${username} and all of their data?`);
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/admin/users/${userId}`, {
        method: "DELETE"
      });
      setMessage(`Deleted ${username}.`, "success");
      await loadUsers();
    } catch (error) {
      setMessage(error.message, "error");
    }
  }
});

usersTableBody.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.dataset.action !== "toggle-admin") {
    return;
  }

  const userId = target.dataset.userId;
  const isAdmin = target.checked;

  try {
    await apiRequest(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ isAdmin })
    });
    setMessage("User role updated.", "success");
    await loadUsers();
  } catch (error) {
    target.checked = !isAdmin;
    setMessage(error.message, "error");
  }
});

async function initializeAdminConsole() {
  const allowed = await checkAdminAccess();
  if (!allowed) {
    return;
  }

  setMessage("Loading users...");
  await loadUsers();
  setMessage("Admin console ready.", "success");
}

initializeAdminConsole();
