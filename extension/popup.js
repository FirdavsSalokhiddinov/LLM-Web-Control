const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');

chrome.storage.local.get('token').then(({ token }) => {
  if (token) {
    tokenInput.value = token;
    statusEl.textContent = 'Token saved.';
    statusEl.className = 'ok';
  }
});

document.getElementById('save').addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token) {
    statusEl.textContent = 'Enter a token first.';
    statusEl.className = 'bad';
    return;
  }
  await chrome.storage.local.set({ token });
  statusEl.textContent = 'Saved. Connecting...';
  statusEl.className = 'ok';
});
