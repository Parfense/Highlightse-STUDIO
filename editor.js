let autoSaveTimer;
let currentDocId = null;

const FONT_STACKS = {
    "Helvetica": "'Helvetica Neue', Helvetica, Arial, sans-serif",
    "Futura": "'Futura', 'Jost', sans-serif",
    "Roboto": "'Roboto', sans-serif",
    "Montserrat": "'Montserrat', sans-serif",
    "Garamond": "'EB Garamond', 'Garamond', serif",
    "Times New Roman": "'Times New Roman', Times, serif"
};

function getVisibleDocs() {
    const user = getActiveUser();
    const db = getDatabase();
    if (!user) return [];
    if (user.role === 'teacher') return db.documents;
    return db.documents.filter(d => d.owner === user.username);
}

function ensureUserHasDoc() {
    const user = getActiveUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('user-avatar-letter').textContent = user.first_name[0] || 'U';
    document.getElementById('user-fullname').textContent = `${user.first_name} ${user.last_name}`.trim();
    document.getElementById('user-meta-info').textContent = `@${user.username}${user.dob ? ' • ' + user.dob : ''}`;

    const db = getDatabase();
    let docs = user.role === 'teacher' ? db.documents : db.documents.filter(d => d.owner === user.username);

    if (docs.length === 0) {
        const nextId = db.documents.reduce((max, d) => Math.max(max, d.id), 100) + 1;
        const nowTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const firstDoc = {
            id: nextId,
            owner: user.username,
            author: `${user.first_name} ${user.last_name}`.trim(),
            title: 'Документ 1',
            font: 'Montserrat',
            updated: nowTime,
            content: '<p><br></p>'
        };
        db.documents.push(firstDoc);
        saveDatabase(db);
        docs = [firstDoc];
    }

    renderSidebarDocs(docs, docs[0].id);
    loadDocIntoSheet(docs[0]);
}

function renderSidebarDocs(docs, activeId) {
    const listEl = document.getElementById('doc-list');
    document.getElementById('doc-count').textContent = docs.length;
    listEl.innerHTML = '';

    docs.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doc-card-item' + (doc.id === activeId ? ' active' : '');
        card.dataset.id = doc.id;
        card.onclick = () => openDocument(doc.id);
        card.innerHTML = `
            <div class="doc-card-top">
                <span class="doc-font-badge">${doc.font}</span>
                <button class="btn-del-doc" onclick="deleteDocument(event, ${doc.id})" title="Удалить документ">✕</button>
            </div>
            <h4 class="doc-card-title">${doc.title}</h4>
            <div class="doc-card-meta">
                <span>👤 ${doc.author}</span>
                <span class="doc-card-time">${doc.updated}</span>
            </div>
        `;
        listEl.appendChild(card);
    });
}

function loadDocIntoSheet(doc) {
    currentDocId = doc.id;
    const sheet = document.getElementById('a4-sheet');
    sheet.dataset.id = doc.id;
    sheet.dataset.font = doc.font || 'Montserrat';
    sheet.innerHTML = doc.content || '<p><br></p>';
    sheet.style.fontFamily = FONT_STACKS[doc.font] || FONT_STACKS['Montserrat'];

    document.getElementById('doc-title').value = doc.title;
    document.getElementById('font-select').value = doc.font || 'Montserrat';
    refreshStats();
}

function openDocument(id) {
    const db = getDatabase();
    const doc = db.documents.find(d => d.id === id);
    if (!doc) return;
    renderSidebarDocs(getVisibleDocs(), id);
    loadDocIntoSheet(doc);
}

function createNewDocument() {
    const user = getActiveUser();
    const db = getDatabase();
    const nextId = db.documents.reduce((max, d) => Math.max(max, d.id), 100) + 1;
    const count = getVisibleDocs().length + 1;
    const nowTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const newDoc = {
        id: nextId,
        owner: user.username,
        author: `${user.first_name} ${user.last_name}`.trim(),
        title: `Документ ${count}`,
        font: 'Montserrat',
        updated: nowTime,
        content: '<p><br></p>'
    };

    db.documents.unshift(newDoc);
    saveDatabase(db);
    renderSidebarDocs(getVisibleDocs(), newDoc.id);
    loadDocIntoSheet(newDoc);
}

function deleteDocument(e, id) {
    e.stopPropagation();
    const visible = getVisibleDocs();
    if (visible.length <= 1) {
        showWordToast('⚠️ В библиотеке должен оставаться хотя бы один документ!');
        return;
    }

    const db = getDatabase();
    db.documents = db.documents.filter(d => d.id !== id);
    saveDatabase(db);

    const remaining = getVisibleDocs();
    renderSidebarDocs(remaining, remaining[0].id);
    loadDocIntoSheet(remaining[0]);
}

function saveDoc(manual = false) {
    const sheet = document.getElementById('a4-sheet');
    const titleEl = document.getElementById('doc-title');
    const fontEl = document.getElementById('font-select');
    const statusPill = document.getElementById('save-status');
    const saveLabel = document.getElementById('save-label');

    if (!sheet || !currentDocId) return;

    statusPill.className = 'sync-pill saving';
    saveLabel.textContent = 'Сохранение...';

    const db = getDatabase();
    const doc = db.documents.find(d => d.id === currentDocId);
    const stamp = new Date().toLocaleTimeString('ru-RU');

    if (doc) {
        doc.title = titleEl.value.trim() || 'Документ';
        doc.font = fontEl.value;
        doc.content = sheet.innerHTML;
        doc.updated = stamp;
        saveDatabase(db);
    }

    statusPill.className = 'sync-pill synced';
    saveLabel.textContent = `Сохранено в ${stamp}`;
    renderSidebarDocs(getVisibleDocs(), currentDocId);

    if (manual) showWordToast('💾 Документ сохранён!');
}

function scheduleAutoSave() {
    refreshStats();
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => saveDoc(false), 400);
}

function cmd(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('a4-sheet').focus();
    scheduleAutoSave();
}

function changeFontFamily(fontName) {
    const sheet = document.getElementById('a4-sheet');
    const stack = FONT_STACKS[fontName] || FONT_STACKS['Montserrat'];
    const sel = window.getSelection();

    if (sel.rangeCount && !sel.isCollapsed && sheet.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        const range = sel.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontFamily = stack;
        span.appendChild(range.extractContents());
        range.insertNode(span);
    } else {
        sheet.style.fontFamily = stack;
    }
    sheet.dataset.font = fontName;
    scheduleAutoSave();
}

function syncFontSize(val) {
    const size = Math.max(5, Math.min(72, parseInt(val) || 18));
    document.getElementById('size-range').value = size;
    document.getElementById('size-num').value = size;

    const sheet = document.getElementById('a4-sheet');
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    if (!sheet.contains(range.commonAncestorContainer)) return;

    if (sel.isCollapsed) {
        sheet.style.fontSize = size + 'px';
    } else {
        const span = document.createElement('span');
        span.style.fontSize = size + 'px';
        span.appendChild(range.extractContents());
        range.insertNode(span);
    }
    scheduleAutoSave();
}

function changeLineHeight(val) {
    document.getElementById('a4-sheet').style.lineHeight = val;
    scheduleAutoSave();
}

function setPaperZoom(percent) {
    document.getElementById('zoom-val').textContent = percent + '%';
    document.getElementById('a4-sheet').style.transform = `scale(${percent / 100})`;
}

function applyHighlight(colorClass) {
    const sheet = document.getElementById('a4-sheet');
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    if (!sheet.contains(range.commonAncestorContainer)) return;

    const mark = document.createElement('span');
    mark.className = `hl-marker ${colorClass}`;
    mark.appendChild(range.extractContents());
    range.insertNode(mark);
    sel.removeAllRanges();
    scheduleAutoSave();
}

function clearSelectionFormat() {
    const sheet = document.getElementById('a4-sheet');
    document.execCommand('removeFormat', false, null);
    sheet.querySelectorAll('.hl-marker').forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
    });
    scheduleAutoSave();
}

// Вставка пустого чекбокса с кнопкой удаления (✕)
function insertTaskCheckbox() {
    const sheet = document.getElementById('a4-sheet');
    const row = document.createElement('div');
    row.className = 'task-row';
    row.contentEditable = 'false';
    row.innerHTML = `
        <button type="button" class="task-check" onclick="toggleTask(this)" title="Отметить">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
        <span class="task-text" contenteditable="true"><br></span>
        <button type="button" class="task-del-btn" onclick="removeTaskCheckbox(this)" title="Удалить чек-бокс">✕</button>
    `;
    sheet.appendChild(row);
    const textSpan = row.querySelector('.task-text');
    if (textSpan) textSpan.focus();
    scheduleAutoSave();
}

function toggleTask(btn) {
    const row = btn.closest('.task-row');
    if (row) {
        row.classList.toggle('done');
        scheduleAutoSave();
    }
}

function removeTaskCheckbox(btn) {
    const row = btn.closest('.task-row');
    if (row) {
        row.remove();
        scheduleAutoSave();
    }
}

function refreshStats() {
    const sheet = document.getElementById('a4-sheet');
    if (!sheet) return;
    const text = sheet.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const allTasks = sheet.querySelectorAll('.task-row').length;
    const doneTasks = sheet.querySelectorAll('.task-row.done').length;

    document.getElementById('stat-words').textContent = `Слов: ${words}`;
    document.getElementById('stat-chars').textContent = `Символов: ${text.length}`;
    document.getElementById('stat-tasks').textContent = `Отметок: ${doneTasks}/${allTasks}`;
}

function filterDocs(q) {
    const query = q.toLowerCase();
    document.querySelectorAll('.doc-card-item').forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(query) ? 'block' : 'none';
    });
}

function exportToWord() {
    const title = document.getElementById('doc-title').value || 'document';
    const content = document.getElementById('a4-sheet').innerHTML;
    const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${title}</title></head>
        <body>${content}</body></html>
    `;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.doc`;
    link.click();
    URL.revokeObjectURL(url);
    showWordToast('📥 Файл .DOC скачан!');
}

function showWordToast(msg) {
    const t = document.getElementById('word-toast');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2300);
}

document.addEventListener('DOMContentLoaded', () => {
    ensureUserHasDoc();
    const sheet = document.getElementById('a4-sheet');
    const titleEl = document.getElementById('doc-title');

    if (sheet) sheet.addEventListener('input', scheduleAutoSave);
    if (titleEl) titleEl.addEventListener('input', scheduleAutoSave);

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveDoc(true);
        }
    });
});
