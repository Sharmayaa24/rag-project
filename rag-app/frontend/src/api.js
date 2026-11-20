const json = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || `Request failed (${res.status})`);
  return data;
};

export const listDocuments = () => fetch("/api/documents").then(json);

export const getAgentCard = () => fetch("/api/a2a/agent-card").then(json);

export const getSettings = () => fetch("/api/settings").then(json);

export const updateSettings = (payload) =>
  fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(json);

export const uploadDocument = (file) => {
  const form = new FormData();
  form.append("file", file);
  return fetch("/api/documents", { method: "POST", body: form }).then(json);
};

export const uploadTextDocument = (title, content) =>
  fetch("/api/documents/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content }),
  }).then(json);

export const uploadUrlDocument = (url) =>
  fetch("/api/documents/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  }).then(json);

export const deleteDocument = (id) =>
  fetch(`/api/documents/${id}`, { method: "DELETE" }).then(json);

export const ask = (question, documentId = null, history = [], forceWebSearch = false) =>
  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      documentId: documentId && documentId !== "all" ? documentId : null,
      history,
      forceWebSearch,
    }),
  }).then(json);
