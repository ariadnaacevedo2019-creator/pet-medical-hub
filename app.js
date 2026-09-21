const STORAGE_KEY = "pet-medical-hub-v1";

const seedState = {
  activePetId: "tommy",
  pets: [
    {
      id: "tommy",
      name: "Tommy",
      species: "Perro",
      breed: "Poodle",
      sex: "Macho",
      birthDate: "2020-02-12",
      weight: "8.2",
      bloodType: "DEA 1.1+",
      conditions: "Reflujo ocasional",
      emoji: "🐶",
      consultations: [
        { id: "c14", date: "2026-06-15", reason: "Vómito amarillo", diagnosis: "Gastritis", vet: "Dra. García", clinic: "Clínica VetCare", treatment: "Omeprazol 10 mg cada 24 h durante 7 días. Dieta blanda.", notes: "Vigilar hidratación y volver si persiste por más de 48 horas." },
        { id: "c13", date: "2026-05-08", reason: "Diarrea", diagnosis: "Parasitosis intestinal", vet: "Dra. García", clinic: "Clínica VetCare", treatment: "Desparasitación y probiótico durante 5 días.", notes: "Control en dos semanas." },
        { id: "c12", date: "2026-01-21", reason: "Vómito amarillo", diagnosis: "Gastritis leve", vet: "Dr. Pablo Ruiz", clinic: "Hospital Animalia", treatment: "Ayuno 8 horas y dieta gastrointestinal.", notes: "Sin signos de alarma." },
        { id: "c11", date: "2025-09-11", reason: "Control preventivo", diagnosis: "Paciente sano", vet: "Dra. García", clinic: "Clínica VetCare", treatment: "Refuerzo de vacuna múltiple.", notes: "Peso estable." }
      ],
      documents: [
        { id: "d1", type: "Receta", title: "Receta para gastritis", date: "2026-06-15", fileName: "receta-gastritis.pdf" },
        { id: "d2", type: "Laboratorio", title: "Química sanguínea", date: "2026-05-08", fileName: "quimica-sanguinea.pdf" },
        { id: "d3", type: "Radiografía", title: "Radiografía abdominal", date: "2026-01-21", fileName: "radiografia-abdominal.jpg" },
        { id: "d4", type: "Vacuna", title: "Vacuna múltiple", date: "2025-09-11", fileName: "cartilla-vacuna.jpg" }
      ]
    }
  ]
};

let state = loadState();
let toastTimer;
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modalRoot");

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(seedState);
  } catch {
    return structuredClone(seedState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activePet() {
  return state.pets.find((pet) => pet.id === state.activePetId) || state.pets[0];
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]);
}

function formatDate(value, options = {}) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", ...options }).format(new Date(`${value}T12:00:00`));
}

function ageFromBirth(value) {
  if (!value) return "Edad sin registrar";
  const birth = new Date(`${value}T12:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age === 1 ? "1 año" : `${Math.max(age, 0)} años`;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function attachmentStore(mode = "readonly") {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pet-medical-hub-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("attachments");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result.transaction("attachments", mode).objectStore("attachments"));
  });
}

async function saveAttachment(id, file) {
  const store = await attachmentStore("readwrite");
  return new Promise((resolve, reject) => { const request = store.put(file, id); request.onsuccess = resolve; request.onerror = () => reject(request.error); });
}

async function getAttachment(id) {
  const store = await attachmentStore();
  return new Promise((resolve, reject) => { const request = store.get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}

async function deleteAttachment(id) {
  const store = await attachmentStore("readwrite");
  return new Promise((resolve, reject) => { const request = store.delete(id); request.onsuccess = resolve; request.onerror = () => reject(request.error); });
}

function getRoute() {
  return (location.hash.replace("#", "") || "inicio").split("/")[0];
}

function render() {
  const route = getRoute();
  document.querySelectorAll(".bottom-nav a").forEach((link) => link.classList.toggle("active", link.dataset.route === route));
  if (!state.pets.length) {
    app.innerHTML = emptyStart();
  } else if (route === "expediente") {
    app.innerHTML = recordsPage();
  } else if (route === "documentos") {
    app.innerHTML = documentsPage();
  } else if (route === "mascotas") {
    app.innerHTML = petsPage();
  } else {
    app.innerHTML = homePage();
  }
  bindPageActions();
  app.focus({ preventScroll: true });
}

function emptyStart() {
  return `<section class="page"><div class="page-header"><p class="eyebrow">Tu expediente empieza aquí</p><h1>La historia de tu mascota, siempre contigo.</h1><p class="muted">Registra a tu primera mascota para crear su resumen clínico.</p></div><div class="empty"><span>🐾</span><h2>Aún no hay mascotas</h2><button class="primary-button" data-action="add-pet">Agregar mascota</button></div></section>`;
}

function homePage() {
  const pet = activePet();
  const visits = [...pet.consultations].sort((a, b) => b.date.localeCompare(a.date));
  const lastVisit = visits[0];
  return `<section class="page">
    <div class="welcome"><div><p class="eyebrow">Resumen clínico</p><h1>Hola, Anna</h1><p class="muted">Todo lo importante para tu próxima consulta.</p></div><span class="privacy-chip">⌁ En este dispositivo</span></div>
    <article class="pet-card">
      <button class="pet-switch" data-action="pet-switch">${escapeHtml(pet.name)} <span aria-hidden="true">⌄</span></button>
      <div class="pet-main"><div class="pet-avatar" aria-hidden="true">${pet.emoji}</div><div><h2 class="pet-name">${escapeHtml(pet.name)}</h2><p class="pet-meta">${escapeHtml(pet.breed || pet.species)} · ${ageFromBirth(pet.birthDate)}</p></div></div>
      <div class="pet-stats"><div class="pet-stat"><strong>${escapeHtml(pet.weight || "—")} kg</strong><span>Último peso</span></div><div class="pet-stat"><strong>${visits.length}</strong><span>Consultas</span></div><div class="pet-stat"><strong>${pet.documents.length}</strong><span>Documentos</span></div></div>
    </article>
    <div class="button-row hero-actions"><button class="primary-button" data-action="add-consultation">＋ Registrar consulta</button><button class="secondary-button" data-action="share">↗ Compartir</button></div>
    <div class="section"><div class="section-heading"><h2>Accesos rápidos</h2></div><div class="quick-grid">
      <button class="quick-card" data-action="add-document"><span class="quick-icon">▤</span><strong>Subir documento</strong></button>
      <button class="quick-card" data-route-to="documentos"><span class="quick-icon">⌕</span><strong>Buscar receta</strong></button>
      <button class="quick-card" data-route-to="expediente"><span class="quick-icon">♡</span><strong>Ver resumen</strong></button>
    </div></div>
    <div class="section"><div class="section-heading"><h2>Consultas recientes</h2><button class="text-button" data-route-to="expediente">Ver todas</button></div>${lastVisit ? timelineHtml(visits.slice(0, 3)) : `<div class="empty"><span>🩺</span>No hay consultas registradas.</div>`}</div>
  </section>`;
}

function timelineHtml(visits) {
  let year = "";
  return `<div class="timeline">${visits.map((visit) => {
    const currentYear = visit.date.slice(0, 4);
    const yearLabel = currentYear !== year ? `<span class="year-label">${currentYear}</span>` : "";
    year = currentYear;
    return `${yearLabel}<button class="visit-card" data-consultation-id="${visit.id}"><div class="visit-top"><span class="tag">Consulta</span><span class="visit-date">${formatDate(visit.date)}</span></div><h3>${escapeHtml(visit.reason)}</h3><p><strong>${escapeHtml(visit.diagnosis || "Sin diagnóstico")}</strong> · ${escapeHtml(visit.vet || "Veterinario sin registrar")}</p></button>`;
  }).join("")}</div>`;
}

function recordsPage() {
  const pet = activePet();
  const visits = [...pet.consultations].sort((a, b) => b.date.localeCompare(a.date));
  return `<section class="page"><div class="page-header"><p class="eyebrow">Expediente de ${escapeHtml(pet.name)}</p><h1>Resumen clínico</h1><p class="muted">Información clave para tomar mejores decisiones con tu veterinario.</p></div>
    <div class="summary-grid">
      <article class="summary-card"><span class="label">Edad</span><strong>${ageFromBirth(pet.birthDate)}</strong></article>
      <article class="summary-card"><span class="label">Peso actual</span><strong>${escapeHtml(pet.weight || "—")} kg</strong></article>
      <article class="summary-card"><span class="label">Tipo sanguíneo</span><strong>${escapeHtml(pet.bloodType || "No registrado")}</strong></article>
      <article class="summary-card"><span class="label">Sexo</span><strong>${escapeHtml(pet.sex || "No registrado")}</strong></article>
      <article class="summary-card wide"><span class="label">Antecedentes relevantes</span><strong>${escapeHtml(pet.conditions || "Sin antecedentes registrados")}</strong><div class="progress"><span></span></div></article>
    </div>
    <div class="button-row hero-actions"><button class="primary-button" data-action="add-consultation">＋ Nueva consulta</button><button class="secondary-button" data-action="share">↗ Compartir</button></div>
    <div class="section"><div class="section-heading"><h2>Historial de consultas</h2><span class="muted small">${visits.length} registros</span></div>${visits.length ? timelineHtml(visits) : `<div class="empty"><span>🩺</span>No hay consultas registradas.</div>`}</div>
  </section>`;
}

const documentIcons = { Receta: "Rx", Laboratorio: "◫", Radiografía: "◉", Vacuna: "✦", Desparasitación: "◌", Otro: "▤" };

function documentsPage() {
  const pet = activePet();
  const docs = [...pet.documents].sort((a, b) => b.date.localeCompare(a.date));
  const grouped = docs.reduce((acc, doc) => { (acc[doc.type] ||= []).push(doc); return acc; }, {});
  return `<section class="page"><div class="page-header"><p class="eyebrow">Archivo de ${escapeHtml(pet.name)}</p><h1>Documentos</h1><p class="muted">Recetas, estudios y comprobantes en un solo lugar.</p></div>
    <button class="primary-button full" data-action="add-document">＋ Agregar documento</button>
    ${docs.length ? Object.entries(grouped).map(([type, items]) => `<div class="section"><div class="section-heading"><h2>${escapeHtml(type)}</h2><span class="muted small">${items.length}</span></div><div class="record-list">${items.map((doc) => `<button class="record-row" data-document-id="${doc.id}"><span class="record-icon">${documentIcons[doc.type] || "▤"}</span><span><h3>${escapeHtml(doc.title)}</h3><p>${formatDate(doc.date)} · ${escapeHtml(doc.fileName || "Sin archivo")}</p></span><span class="chevron">›</span></button>`).join("")}</div></div>`).join("") : `<div class="section empty"><span>📄</span>No hay documentos todavía.</div>`}
  </section>`;
}

function petsPage() {
  return `<section class="page"><div class="page-header"><p class="eyebrow">Familia</p><h1>Mis mascotas</h1><p class="muted">Selecciona el expediente que quieres consultar.</p></div>
    <div class="pet-list">${state.pets.map((pet) => `<button class="pet-list-card ${pet.id === state.activePetId ? "active" : ""}" data-pet-id="${pet.id}"><span class="pet-avatar">${pet.emoji}</span><span><h3>${escapeHtml(pet.name)}</h3><p>${escapeHtml(pet.breed || pet.species)} · ${ageFromBirth(pet.birthDate)}</p></span>${pet.id === state.activePetId ? `<span class="check">✓</span>` : `<span class="chevron">›</span>`}</button>`).join("")}</div>
    <div class="section"><button class="primary-button full" data-action="add-pet">＋ Agregar mascota</button></div>
    <p class="notice section">La información se guarda localmente en este dispositivo. Para atención médica, comparte el resumen con tu veterinario.</p>
  </section>`;
}

function bindPageActions() {
  document.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", () => handleAction(el.dataset.action)));
  document.querySelectorAll("[data-route-to]").forEach((el) => el.addEventListener("click", () => { location.hash = el.dataset.routeTo; }));
  document.querySelectorAll("[data-consultation-id]").forEach((el) => el.addEventListener("click", () => openConsultation(el.dataset.consultationId)));
  document.querySelectorAll("[data-document-id]").forEach((el) => el.addEventListener("click", () => openDocument(el.dataset.documentId)));
  document.querySelectorAll("[data-pet-id]").forEach((el) => el.addEventListener("click", () => selectPet(el.dataset.petId)));
}

function handleAction(action) {
  if (action === "add-pet") openPetForm();
  if (action === "add-consultation") openConsultationForm();
  if (action === "add-document") openDocumentForm();
  if (action === "share") shareSummary();
  if (action === "pet-switch") openPetSwitcher();
}

function showModal(content) {
  modalRoot.innerHTML = `<section class="modal" role="dialog" aria-modal="true"><div class="modal-handle"></div>${content}</section>`;
  document.body.style.overflow = "hidden";
  modalRoot.querySelector(".close-button")?.addEventListener("click", closeModal);
  modalRoot.addEventListener("click", (event) => { if (event.target === modalRoot) closeModal(); }, { once: true });
  modalRoot.querySelector("input, button, select, textarea")?.focus();
}

function closeModal() {
  modalRoot.innerHTML = "";
  document.body.style.overflow = "";
}

function modalHeader(title, subtitle = "") {
  return `<div class="modal-header"><div><h2>${title}</h2>${subtitle ? `<p class="muted small">${subtitle}</p>` : ""}</div><button class="close-button" aria-label="Cerrar">×</button></div>`;
}

function openPetForm() {
  showModal(`${modalHeader("Agregar mascota", "Crea su expediente clínico en menos de un minuto.")}<form id="petForm" class="form-grid">
    <div class="field-row"><div class="field"><label for="petName">Nombre *</label><input id="petName" name="name" required autocomplete="off" /></div><div class="field"><label for="species">Especie *</label><select id="species" name="species"><option>Perro</option><option>Gato</option><option>Otro</option></select></div></div>
    <div class="field-row"><div class="field"><label for="breed">Raza</label><input id="breed" name="breed" /></div><div class="field"><label for="sex">Sexo</label><select id="sex" name="sex"><option value="">Seleccionar</option><option>Hembra</option><option>Macho</option></select></div></div>
    <div class="field-row"><div class="field"><label for="birthDate">Fecha de nacimiento</label><input id="birthDate" name="birthDate" type="date" /></div><div class="field"><label for="weight">Peso (kg)</label><input id="weight" name="weight" inputmode="decimal" type="number" min="0" step="0.1" /></div></div>
    <div class="field"><label for="conditions">Antecedentes relevantes</label><textarea id="conditions" name="conditions" placeholder="Alergias, padecimientos o tratamientos actuales"></textarea></div>
    <div class="form-actions"><button type="button" class="secondary-button" id="cancelForm">Cancelar</button><button class="primary-button">Crear expediente</button></div>
  </form>`);
  document.querySelector("#cancelForm").addEventListener("click", closeModal);
  document.querySelector("#petForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const pet = { id: uid("pet"), ...data, bloodType: "", emoji: data.species === "Gato" ? "🐱" : data.species === "Perro" ? "🐶" : "🐾", consultations: [], documents: [] };
    state.pets.push(pet); state.activePetId = pet.id; saveState(); closeModal(); location.hash = "inicio"; render(); showToast("Expediente creado");
  });
}

function openConsultationForm() {
  if (!state.pets.length) return openPetForm();
  const today = new Date().toISOString().slice(0, 10);
  showModal(`${modalHeader("Registrar consulta", `Expediente de ${escapeHtml(activePet().name)}`)}<form id="consultationForm" class="form-grid">
    <div class="field"><label for="consultDate">Fecha *</label><input id="consultDate" name="date" type="date" value="${today}" required /></div>
    <div class="field"><label for="reason">Motivo de consulta *</label><input id="reason" name="reason" required placeholder="Ej. vómito, control preventivo" /></div>
    <div class="field"><label for="diagnosis">Diagnóstico</label><input id="diagnosis" name="diagnosis" placeholder="Según indicación del veterinario" /></div>
    <div class="field-row"><div class="field"><label for="vet">Veterinario</label><input id="vet" name="vet" /></div><div class="field"><label for="clinic">Clínica</label><input id="clinic" name="clinic" /></div></div>
    <div class="field"><label for="treatment">Tratamiento</label><textarea id="treatment" name="treatment" placeholder="Medicamento, dosis y duración"></textarea></div>
    <div class="field"><label for="notes">Notas</label><textarea id="notes" name="notes" placeholder="Indicaciones y señales de alerta"></textarea></div>
    <div class="form-actions"><button type="button" class="secondary-button" id="cancelForm">Cancelar</button><button class="primary-button">Guardar consulta</button></div>
  </form>`);
  document.querySelector("#cancelForm").addEventListener("click", closeModal);
  document.querySelector("#consultationForm").addEventListener("submit", (event) => {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
    activePet().consultations.push({ id: uid("consult"), ...data }); saveState(); closeModal(); render(); showToast("Consulta guardada");
  });
}

function openDocumentForm() {
  if (!state.pets.length) return openPetForm();
  const today = new Date().toISOString().slice(0, 10);
  showModal(`${modalHeader("Agregar documento", "Organízalo para encontrarlo en segundos.")}<form id="documentForm" class="form-grid">
    <div class="field"><label for="docType">Tipo *</label><select id="docType" name="type"><option>Receta</option><option>Laboratorio</option><option>Radiografía</option><option>Vacuna</option><option>Desparasitación</option><option>Otro</option></select></div>
    <div class="field"><label for="docTitle">Título *</label><input id="docTitle" name="title" required placeholder="Ej. receta para gastritis" /></div>
    <div class="field"><label for="docDate">Fecha *</label><input id="docDate" name="date" type="date" value="${today}" required /></div>
    <div class="field"><label for="docFile">Archivo o fotografía</label><input id="docFile" name="file" type="file" accept="image/*,.pdf" /><p class="help">En este MVP guardamos el nombre y la clasificación; el archivo permanece en tu dispositivo.</p></div>
    <div class="form-actions"><button type="button" class="secondary-button" id="cancelForm">Cancelar</button><button class="primary-button">Guardar documento</button></div>
  </form>`);
  document.querySelector("#cancelForm").addEventListener("click", closeModal);
  document.querySelector("#documentForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
    const file = form.elements.file.files[0];
    if (file && file.size > 12_000_000) { showToast("El archivo debe pesar menos de 12 MB"); return; }
    const fileName = file?.name || "Sin archivo adjunto";
    const id = uid("doc");
    if (file) await saveAttachment(id, file);
    activePet().documents.push({ id, type: data.type, title: data.title, date: data.date, fileName, fileType: file?.type || "", hasFile: Boolean(file) }); saveState(); closeModal(); location.hash = "documentos"; render(); showToast("Documento agregado");
  });
}

function openConsultation(id) {
  const visit = activePet().consultations.find((item) => item.id === id); if (!visit) return;
  showModal(`${modalHeader(escapeHtml(visit.reason), formatDate(visit.date))}<div class="detail-block"><span class="label">Diagnóstico</span><p>${escapeHtml(visit.diagnosis || "Sin diagnóstico registrado")}</p></div><div class="detail-block"><span class="label">Tratamiento</span><p>${escapeHtml(visit.treatment || "Sin tratamiento registrado")}</p></div><div class="detail-block"><span class="label">Veterinario y clínica</span><p>${escapeHtml(visit.vet || "Sin registrar")}${visit.clinic ? ` · ${escapeHtml(visit.clinic)}` : ""}</p></div><div class="detail-block"><span class="label">Notas</span><p>${escapeHtml(visit.notes || "Sin notas")}</p></div><button class="danger-button full" id="deleteConsultation">Eliminar consulta</button>`);
  document.querySelector("#deleteConsultation").addEventListener("click", () => { if (confirm("¿Eliminar esta consulta?")) { activePet().consultations = activePet().consultations.filter((item) => item.id !== id); saveState(); closeModal(); render(); showToast("Consulta eliminada"); } });
}

function openDocument(id) {
  const doc = activePet().documents.find((item) => item.id === id); if (!doc) return;
  showModal(`${modalHeader(escapeHtml(doc.title), escapeHtml(doc.type))}<div class="detail-block"><span class="label">Fecha</span><p>${formatDate(doc.date)}</p></div><div class="detail-block"><span class="label">Archivo</span><p>${escapeHtml(doc.fileName)}</p></div>${doc.hasFile ? `<button class="primary-button full" id="openAttachment">Abrir archivo</button>` : `<p class="notice">Este registro no contiene una copia del archivo.</p>`}<p class="notice section">El archivo se conserva únicamente en este navegador; no se sube a la nube.</p><button class="danger-button full section" id="deleteDocument">Eliminar documento</button>`);
  document.querySelector("#openAttachment")?.addEventListener("click", async () => { const preview = window.open("", "_blank"); const file = await getAttachment(id); if (!file) { preview?.close(); showToast("El archivo ya no está disponible"); return; } const url = URL.createObjectURL(file); if (preview) preview.location.href = url; else location.href = url; setTimeout(() => URL.revokeObjectURL(url), 60_000); });
  document.querySelector("#deleteDocument").addEventListener("click", async () => { if (confirm("¿Eliminar este documento?")) { if (doc.hasFile) await deleteAttachment(id); activePet().documents = activePet().documents.filter((item) => item.id !== id); saveState(); closeModal(); render(); showToast("Documento eliminado"); } });
}

function selectPet(id) {
  state.activePetId = id; saveState(); render(); showToast(`${activePet().name} seleccionado`);
}

function openPetSwitcher() {
  showModal(`${modalHeader("Cambiar mascota", "Elige el expediente activo.")}<div class="pet-list">${state.pets.map((pet) => `<button class="pet-list-card ${pet.id === state.activePetId ? "active" : ""}" data-switch-pet="${pet.id}"><span class="pet-avatar">${pet.emoji}</span><span><h3>${escapeHtml(pet.name)}</h3><p>${escapeHtml(pet.breed || pet.species)}</p></span>${pet.id === state.activePetId ? `<span class="check">✓</span>` : `<span class="chevron">›</span>`}</button>`).join("")}</div><button class="primary-button full section" id="switchAddPet">＋ Agregar mascota</button>`);
  document.querySelectorAll("[data-switch-pet]").forEach((el) => el.addEventListener("click", () => { state.activePetId = el.dataset.switchPet; saveState(); closeModal(); render(); }));
  document.querySelector("#switchAddPet").addEventListener("click", openPetForm);
}

function clinicalSummary(pet) {
  const visits = [...pet.consultations].sort((a, b) => b.date.localeCompare(a.date));
  return `RESUMEN CLÍNICO · ${pet.name}\n${pet.species} · ${pet.breed || "Raza sin registrar"} · ${ageFromBirth(pet.birthDate)}\nPeso: ${pet.weight || "—"} kg\nAntecedentes: ${pet.conditions || "Sin antecedentes registrados"}\n\nCONSULTAS RECIENTES\n${visits.slice(0, 5).map((v) => `${formatDate(v.date)} — ${v.reason}\nDiagnóstico: ${v.diagnosis || "Sin registrar"}\nTratamiento: ${v.treatment || "Sin registrar"}\nVeterinario: ${v.vet || "Sin registrar"}`).join("\n\n")}\n\nGenerado con Pet Medical Hub. Este resumen no sustituye la valoración de un veterinario.`;
}

async function shareSummary() {
  const pet = activePet(); const text = clinicalSummary(pet);
  try {
    if (navigator.share) await navigator.share({ title: `Resumen clínico de ${pet.name}`, text });
    else { await navigator.clipboard.writeText(text); showToast("Resumen copiado"); }
  } catch (error) { if (error.name !== "AbortError") showToast("No se pudo compartir"); }
}

function openSearch() {
  showModal(`${modalHeader("Buscar", "Encuentra una consulta o documento.")}<div class="search-input"><input id="globalSearch" type="search" placeholder="Diagnóstico, receta, veterinario…" autocomplete="off" /></div><div class="search-results" id="searchResults"><div class="empty"><span>⌕</span>Escribe para buscar en el expediente.</div></div>`);
  const input = document.querySelector("#globalSearch");
  input.addEventListener("input", () => renderSearchResults(input.value)); input.focus();
}

function renderSearchResults(query) {
  const container = document.querySelector("#searchResults"); const term = query.trim().toLowerCase();
  if (!term) { container.innerHTML = `<div class="empty"><span>⌕</span>Escribe para buscar en el expediente.</div>`; return; }
  const pet = activePet();
  const visits = pet.consultations.filter((v) => Object.values(v).some((value) => String(value).toLowerCase().includes(term))).map((v) => ({ kind: "consultation", id: v.id, title: v.reason, detail: `${v.diagnosis || "Sin diagnóstico"} · ${formatDate(v.date)}` }));
  const docs = pet.documents.filter((d) => Object.values(d).some((value) => String(value).toLowerCase().includes(term))).map((d) => ({ kind: "document", id: d.id, title: d.title, detail: `${d.type} · ${formatDate(d.date)}` }));
  const results = [...visits, ...docs];
  container.innerHTML = results.length ? results.map((item) => `<button class="search-result" data-search-kind="${item.kind}" data-search-id="${item.id}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></button>`).join("") : `<div class="empty"><span>∅</span>No encontramos resultados para “${escapeHtml(query)}”.</div>`;
  container.querySelectorAll("[data-search-id]").forEach((el) => el.addEventListener("click", () => { closeModal(); el.dataset.searchKind === "consultation" ? openConsultation(el.dataset.searchId) : openDocument(el.dataset.searchId); }));
}

function openAbout() {
  showModal(`${modalHeader("Pet Medical Hub", "MVP · Septiembre 2026")}<div class="about-quote">“Tu mascota no puede contarle al veterinario lo que ha vivido. Su expediente sí.”</div><p>Centraliza antecedentes, consultas y documentos para llegar mejor preparado a cualquier consulta veterinaria.</p><p class="notice">Pet Medical Hub organiza información; no diagnostica enfermedades ni reemplaza la atención profesional.</p><button class="secondary-button full section" id="resetDemo">Restaurar datos de demostración</button>`);
  document.querySelector("#resetDemo").addEventListener("click", () => { if (confirm("¿Restaurar todos los datos de demostración? Se perderán tus cambios locales.")) { state = structuredClone(seedState); saveState(); closeModal(); location.hash = "inicio"; render(); showToast("Datos restaurados"); } });
}

function showToast(message) {
  const toast = document.querySelector("#toast"); clearTimeout(toastTimer); toast.textContent = message; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

window.addEventListener("hashchange", render);
document.querySelector("#quickAddButton").addEventListener("click", openConsultationForm);
document.querySelector("#searchButton").addEventListener("click", openSearch);
document.querySelector("#profileButton").addEventListener("click", openAbout);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
render();
