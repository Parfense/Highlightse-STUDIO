let autoSaveTimer;

const FONT_STACKS = {
    "Helvetica": "'Helvetica Neue', Helvetica, Arial, sans-serif",
    "Futura": "'Futura', 'Jost', sans-serif",
    "Roboto": "'Roboto', sans-serif",
    "Montserrat": "'Montserrat', sans-serif",
    "Garamond": "'EB Garamond', 'Garamond', serif",
    "Times New Roman": "'Times New Roman', Times, serif"
};

function cmd(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('a4-sheet').focus();
    scheduleAutoSave();
}

// Смена любого из 6 шрифтов
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

// Размер шрифта от 5 до 72 px
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

// Межстрочный интервал
function changeLineHeight(val) {
    document.getElementById('a4-sheet').style.lineHeight = val;
    scheduleAutoSave();
}

// Масштаб листа А4 (Zoom)
function setPaperZoom(percent) {
    document.getElementById('zoom-val').textContent = percent + '%';
    document.getElementById('a4-sheet').style.transform = `scale(${percent / 100})`;
}

// 🖍️ Выделитель с плавным фоном и округлёнными краями (4 цвета)
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

// Очистка выделения
function clearSelectionFormat() {
    const sheet = document.getElementById('a4-sheet');
    document.execCommand('removeFormat', false, null);
    sheet.querySelectorAll('.hl-marker').forEach(el => {
        const text = document.createTextNode(el.textContent);
        el.parentNode.replaceChild(text, el);
    });
    scheduleAutoSave();
}

// ✅ Вставка и переключение кастомного SVG-чекбокса
function insertTaskCheckbox() {
    const sheet = document.getElementById('a4-sheet');
    const row = document.createElement('div');
    row.className = 'task-row';
    row.contentEditable = 'false';
    row.innerHTML = `
        <button class="task-check" onclick="toggleTask(this)">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
        <span class="task-text" contenteditable="true">Новая задача...</span>
    `;
    sheet.appendChild(row);
    scheduleAutoSave();
}

function toggleTask(btn) {
    const row = btn.closest('.task-row');
    if (row) {
        row.classList.toggle('done');
        scheduleAutoSave();
    }
}

// Статистика слов, символов и выполненных галочек
function refreshStats() {
    const sheet = document.getElementById('a4-sheet');
    if (!sheet) return;
    const text = sheet.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const allTasks = sheet.querySelectorAll('.task-row').length;
    const doneTasks = sheet.querySelectorAll('.task-row.done').length;

    document.getElementById('stat-words').textContent = `Слов: ${words}`;
    document.getElementById('stat-chars').textContent = `Символов: ${text.length}`;
    document.getElementById('stat-tasks').textContent = `Задач выполнено: ${doneTasks}/${allTasks}`;
}

// Сохранение документа
function saveDoc(manual = false) {
    const sheet = document.getElementById('a4-sheet');
    const titleEl = document.getElementById('doc-title');
    const fontEl = document.getElementById('font-select');
    const statusPill = document.getElementById('save-status');
    const saveLabel = document.getElementById('save-label');

    if (!sheet) return;

    statusPill.className = 'sync-pill saving';
    saveLabel.textContent = 'Сохранение...';

    fetch('/api/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: parseInt(sheet.dataset.id),
            title: titleEl.value,
            font: fontEl.value,
            content: sheet.innerHTML
        })
    })
    .then(r => r.json())
    .then(res => {
        if (res.ok) {
            statusPill.className = 'sync-pill synced';
            saveLabel.textContent = `Сохранено в ${res.time}`;

            const card = document.querySelector(`.doc-card-item[data-id="${res.id}"]`);
            if (card) {
                card.querySelector('.doc-card-title').textContent = titleEl.value;
                card.querySelector('.doc-font-badge').textContent = fontEl.value;
                card.querySelector('.doc-card-time').textContent = res.time;
            }
            if (manual) showStudioToast('💾 Документ успешно сохранён!');
        }
    });
}

function scheduleAutoSave() {
    refreshStats();
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => saveDoc(false), 600);
}

// Открытие, создание и удаление документов
function openDocument(id, cardEl) {
    document.querySelectorAll('.doc-card-item').forEach(c => c.classList.remove('active'));
    if (cardEl) cardEl.classList.add('active');

    fetch(`/api/docs/${id}`)
        .then(r => r.json())
        .then(doc => {
            const sheet = document.getElementById('a4-sheet');
            sheet.dataset.id = doc.id;
            sheet.dataset.font = doc.font;
            sheet.innerHTML = doc.content;
            sheet.style.fontFamily = FONT_STACKS[doc.font] || FONT_STACKS['Montserrat'];
            document.getElementById('doc-title').value = doc.title;
            document.getElementById('font-select').value = doc.font;
            refreshStats();
        });
}

function createNewDocument() {
    fetch('/api/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: 999999,
            title: 'Новый документ Word',
            font: 'Montserrat',
            content: '<h2>Чистый лист</h2><p>Начните вводить текст или выделите важную мысль маркером...</p>'
        })
    })
    .then(r => r.json())
    .then(() => window.location.reload());
}

function deleteDocument(e, id) {
    e.stopPropagation();
    fetch(`/api/docs/delete/${id}`, { method: 'POST' })
        .then(r => r.json())
        .then(res => {
            if (res.ok) window.location.reload();
            else showStudioToast('⚠️ ' + res.error);
        });
}

function filterDocs(q) {
    const query = q.toLowerCase();
    document.querySelectorAll('.doc-card-item').forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(query) ? 'block' : 'none';
    });
}

// Экспорт в настоящий файл Microsoft Word (.doc)
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
    showStudioToast('📥 Файл .DOC скачан!');
}

function showStudioToast(msg) {
    const t = document.getElementById('studio-toast');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2300);
}

document.addEventListener('DOMContentLoaded', () => {
    const sheet = document.getElementById('a4-sheet');
    const titleEl = document.getElementById('doc-title');
    if (sheet) {
        sheet.style.fontFamily = FONT_STACKS[sheet.dataset.font] || FONT_STACKS['Montserrat'];
        sheet.addEventListener('input', scheduleAutoSave);
        refreshStats();
    }
    if (titleEl) titleEl.addEventListener('input', scheduleAutoSave);

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveDoc(true);
        }
    });
});
