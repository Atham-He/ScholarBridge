async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(data.error || response.statusText || 'Request failed');
  }
  return data;
}

function parseJsonOrUndefined(value) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return JSON.parse(trimmed);
}

async function loadPersonas() {
  const data = await fetchJson('/api/personas');
  const list = document.getElementById('persona-list');
  list.innerHTML = '';
  for (const item of data.items) {
    const li = document.createElement('li');
    li.textContent = `${item.slug} - ${item.name} (${item.affiliation || 'unknown'})`;
    li.dataset.slug = item.slug;
    li.onclick = async () => {
      const detail = await fetchJson(`/api/personas/${item.slug}`);
      document.getElementById('persona-detail').textContent = JSON.stringify(detail, null, 2);
      document.getElementById('chat-mentor').value = item.slug;
      document.getElementById('eval-mentor').value = item.slug;
      document.getElementById('update-slug').value = item.slug;
    };
    list.appendChild(li);
  }
}

document.getElementById('build-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const fd = new FormData(form);
  const resultEl = document.getElementById('build-result');
  resultEl.textContent = 'Building...';
  try {
    const data = await fetchJson('/api/personas/build', { method: 'POST', body: fd });
    resultEl.textContent = JSON.stringify(data, null, 2);
    await loadPersonas();
  } catch (error) {
    resultEl.textContent = error.message;
  }
});

document.getElementById('refresh-personas').addEventListener('click', loadPersonas);

document.getElementById('update-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const fd = new FormData(form);
  const slug = String(fd.get('slug') || '').trim();
  const resultEl = document.getElementById('update-result');
  fd.delete('slug');
  resultEl.textContent = 'Updating...';
  try {
    const data = await fetchJson(`/api/personas/${encodeURIComponent(slug)}/update`, { method: 'POST', body: fd });
    resultEl.textContent = JSON.stringify(data, null, 2);
    document.getElementById('persona-detail').textContent = JSON.stringify(data.persona, null, 2);
    await loadPersonas();
  } catch (error) {
    resultEl.textContent = error.message;
  }
});

document.getElementById('send-chat').addEventListener('click', async () => {
  const slug = document.getElementById('chat-mentor').value.trim();
  const sessionId = document.getElementById('chat-session').value.trim();
  const message = document.getElementById('chat-message').value.trim();
  const output = document.getElementById('chat-output');
  try {
    const studentProfile = parseJsonOrUndefined(document.getElementById('student-profile').value);
    const body = { message, studentProfile };
    if (sessionId) body.sessionId = sessionId;
    const data = await fetchJson(`/api/personas/${slug}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    output.textContent = JSON.stringify(data, null, 2);
    document.getElementById('chat-session').value = data.sessionId || sessionId;
  } catch (error) {
    output.textContent = error.message;
  }
});

document.getElementById('run-eval').addEventListener('click', async () => {
  const slug = document.getElementById('eval-mentor').value.trim();
  const sessionId = document.getElementById('eval-session').value.trim();
  const output = document.getElementById('eval-output');
  try {
    const studentProfile = parseJsonOrUndefined(document.getElementById('eval-student').value);
    const body = { studentProfile };
    if (sessionId) body.sessionId = sessionId;
    const data = await fetchJson(`/api/personas/${slug}/evaluate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    output.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    output.textContent = error.message;
  }
});

loadPersonas().catch((error) => {
  document.getElementById('persona-detail').textContent = error.message;
});
