const json = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || `Request failed (${res.status})`);
  return data;
};

export const listDocuments = () => fetch("/api/documents").then(json);

export const uploadDocument = (file) => {
  const form = new FormData();
  form.append("file", file);
  return fetch("/api/documents", { method: "POST", body: form }).then(json);
};

export const deleteDocument = (id) =>
  fetch(`/api/documents/${id}`, { method: "DELETE" }).then(json);

export const ask = (question, documentId = null) =>
  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      documentId: documentId && documentId !== "all" ? documentId : null,
    }),
  }).then(json);

