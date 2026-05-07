const ROWS = 7;
const WEEKS = 52;

const charMap = {
    a: ['     ','11111','1   1','11111','1   1','1   1','     '],
    b: ['     ','1111 ','1   1','11111','1   1','1111 ','     '],
    c: ['     ','11111','1    ','1    ','1    ','11111','     '],
    d: ['     ','1111 ','1   1','1   1','1   1','1111 ','     '],
    e: ['     ','11111','1    ','11111','1    ','11111','     '],
    f: ['     ','11111','1    ','1111 ','1    ','1    ','     '],
    g: ['     ','11111','1    ','1 111','1   1','11111','     '],
    h: ['     ','1   1','1   1','11111','1   1','1   1','     '],
    i: ['     ','11111','  1  ','  1  ','  1  ','11111','     '],
    j: ['     ','1111 ','  1  ','  1  ','1 1  ','111  ','     '],
    k: ['     ','1  1 ','1 1  ','11   ','1 1  ','1  1 ','     '],
    l: ['     ','1    ','1    ','1    ','1    ','11111','     '],
    m: ['     ','1   1','11 11','1 1 1','1   1','1   1','     '],
    n: ['     ','1   1','11  1','1 1 1','1  11','1   1','     '],
    o: ['     ','11111','1   1','1   1','1   1','11111','     '],
    p: ['     ','11111','1   1','11111','1    ','1    ','     '],
    q: ['     ','11111','1   1','1   1','1  11','11111','     '],
    r: ['     ','11111','1   1','11111','1  1 ','1   1','     '],
    s: ['     ','11111','1    ','11111','    1','11111','     '],
    t: ['     ','11111','  1  ','  1  ','  1  ','  1  ','     '],
    u: ['     ','1   1','1   1','1   1','1   1','11111','     '],
    v: ['     ','1   1','1   1',' 1 1 ',' 1 1 ','  1  ','     '],
    w: ['     ','1   1','1   1','1   1','1 1 1','11 11','     '],
    x: ['     ','1   1',' 1 1 ','  1  ',' 1 1 ','1   1','     '],
    y: ['     ','1   1',' 1 1 ','  1  ','  1  ','  1  ','     '],
    z: ['     ','11111','   1 ','  1  ',' 1   ','11111','     '],
    ' ': ['  ','  ','  ','  ','  ','  ','  ']
};

// ─── Canvas State ────────────────────────────────────────
let canvasData = [];
let currentShade = 4;
let isPainting = false;

function initCanvas() {
    const grid = document.getElementById('canvas-grid');
    canvasData = Array.from({ length: WEEKS }, () => Array(ROWS).fill(0));

    for (let week = 0; week < WEEKS; week++) {
        for (let day = 0; day < ROWS; day++) {
            const cell = document.createElement('div');
            cell.className = 'canvas-cell';
            cell.dataset.week = week;
            cell.dataset.day = day;

            cell.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isPainting = true;
                paintCell(cell, week, day);
            });
            cell.addEventListener('mouseenter', () => {
                if (isPainting) paintCell(cell, week, day);
            });
            cell.addEventListener('touchstart', (e) => {
                e.preventDefault();
                isPainting = true;
                paintCell(cell, week, day);
            }, { passive: false });
            cell.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                if (el && el.classList.contains('canvas-cell')) {
                    paintCell(el, parseInt(el.dataset.week), parseInt(el.dataset.day));
                }
            }, { passive: false });

            grid.appendChild(cell);
        }
    }

    document.addEventListener('mouseup', () => isPainting = false);
    document.addEventListener('touchend', () => isPainting = false);
}

function paintCell(cell, week, day) {
    canvasData[week][day] = currentShade;
    cell.className = 'canvas-cell' + (currentShade > 0 ? ` g${currentShade}` : '');
}

function clearCanvas() {
    canvasData = Array.from({ length: WEEKS }, () => Array(ROWS).fill(0));
    document.querySelectorAll('.canvas-cell').forEach(c => c.className = 'canvas-cell');
}

function exportJSON() {
    const pattern = [];
    for (let day = 0; day < ROWS; day++) {
        let row = '';
        for (let week = 0; week < WEEKS; week++) {
            row += canvasData[week][day] || '0';
        }
        pattern.push(row);
    }

    // Trim trailing zeros from each row
    const trimmed = pattern.map(r => r.replace(/0+$/, '') || '0');
    const json = JSON.stringify(trimmed, null, 4);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pattern.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Pattern exported as JSON!');
}

function loadTextToCanvas(grid) {
    clearCanvas();
    const cells = document.querySelectorAll('.canvas-cell');
    const maxCols = Math.max(...grid.map(r => r.length));
    const offset = Math.max(0, Math.floor((WEEKS - maxCols) / 2));

    for (let week = 0; week < WEEKS; week++) {
        for (let day = 0; day < ROWS; day++) {
            const srcWeek = week - offset;
            const val = (srcWeek >= 0 && srcWeek < maxCols && grid[day]) ? (grid[day][srcWeek] || 0) : 0;
            const clamped = Math.min(val, 4);
            canvasData[week][day] = clamped;
            const idx = week * ROWS + day;
            if (cells[idx]) {
                cells[idx].className = 'canvas-cell' + (clamped > 0 ? ` g${clamped}` : '');
            }
        }
    }
    showToast('Text loaded to canvas!');
}

// ─── Shade Picker ────────────────────────────────────────
function initShadePicker() {
    document.querySelectorAll('.shade-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.shade-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentShade = parseInt(btn.dataset.shade);
        });
    });
}

// ─── Text Preview ────────────────────────────────────────
function textToGrid(text, invert, multiplier) {
    const input = text.toLowerCase();
    let shape = new Array(ROWS).fill(' ');

    for (const ch of input) {
        const glyph = charMap[ch];
        if (!glyph) continue;
        for (let row = 0; row < ROWS; row++) {
            shape[row] += glyph[row] + ' ';
        }
    }

    shape = shape.map(r => r.replace(/ /g, '0'));
    let grid = shape.map(r => r.split('').map(Number));

    if (invert) {
        const peak = Math.max(...grid.flat());
        grid = grid.map(row => row.map(c => peak - c));
    }

    grid = grid.map(row => row.map(c => Math.min(c * multiplier, 4)));
    return grid;
}

function renderPreview() {
    const text = document.getElementById('preview-input').value || '';
    const invert = document.getElementById('invert-toggle').checked;
    const multiplier = parseInt(document.getElementById('intensity-select').value);

    const grid = textToGrid(text, invert, multiplier);
    const container = document.getElementById('preview-grid');
    container.innerHTML = '';

    if (!text.trim()) {
        for (let col = 0; col < 20; col++) {
            for (let row = 0; row < ROWS; row++) {
                const cell = document.createElement('div');
                cell.className = 'graph-cell';
                container.appendChild(cell);
            }
        }
        return;
    }

    const maxCols = Math.max(...grid.map(r => r.length));
    const totalCols = Math.max(maxCols + 4, 20);
    const padLeft = Math.floor((totalCols - maxCols) / 2);

    for (let col = 0; col < totalCols; col++) {
        for (let row = 0; row < ROWS; row++) {
            const cell = document.createElement('div');
            const dataCol = col - padLeft;
            const val = (dataCol >= 0 && dataCol < maxCols && grid[row]) ? (grid[row][dataCol] || 0) : 0;
            let cls = 'graph-cell';
            if (val >= 4) cls += ' g4';
            else if (val >= 3) cls += ' g3';
            else if (val >= 2) cls += ' g2';
            else if (val >= 1) cls += ' g1';
            cell.className = cls;
            container.appendChild(cell);
        }
    }

    const cmdEl = document.querySelector('#preview-command code');
    let cmd = `git-commit-painter -t "${text}"`;
    if (multiplier > 1) cmd += ` --multiplier ${multiplier}`;
    if (invert) cmd += ` --invert`;
    cmdEl.textContent = cmd;
}

// ─── Hero Grid ───────────────────────────────────────────
function initHeroGrid() {
    const container = document.getElementById('hero-grid');
    if (!container) return;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < WEEKS * ROWS; i++) {
        const cell = document.createElement('div');
        cell.className = 'hero-cell';
        const r = Math.random();
        if (r > 0.92) cell.style.background = 'var(--green-4)';
        else if (r > 0.85) cell.style.background = 'var(--green-3)';
        else if (r > 0.75) cell.style.background = 'var(--green-2)';
        else if (r > 0.6) cell.style.background = 'var(--green-1)';
        else cell.style.background = 'var(--graph-empty)';
        fragment.appendChild(cell);
    }
    container.appendChild(fragment);
}

// ─── GitHub Command Generator ────────────────────────────
function initGitHub() {
    const yearSelect = document.getElementById('gh-year');
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 5; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSelect.appendChild(opt);
    }

    document.getElementById('generate-cmd-btn').addEventListener('click', () => {
        const username = document.getElementById('gh-username').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const year = document.getElementById('gh-year').value;
        const multiplier = document.getElementById('gh-multiplier').value;

        if (!username || !repo) {
            showToast('Please fill in username and repository name.');
            return;
        }

        const origin = `https://github.com/${username}/${repo}.git`;

        // Check if canvas has content
        const hasCanvasArt = canvasData.some(week => week.some(d => d > 0));
        let cmd;

        if (hasCanvasArt) {
            cmd = `git-commit-painter -f pattern.json --multiplier ${multiplier} --startdate ${year}-01-01 --push --origin ${origin}`;
        } else {
            const text = document.getElementById('preview-input').value.trim() || 'hello';
            cmd = `git-commit-painter -t "${text}" --multiplier ${multiplier} --startdate ${year}-01-01 --push --origin ${origin}`;
        }

        document.getElementById('final-cmd').textContent = cmd;
        document.getElementById('generated-command').style.display = 'block';

        if (hasCanvasArt) {
            showToast('Command generated! Export the canvas JSON first, then run the command.');
        } else {
            showToast('Command generated! Copy and run it in your terminal.');
        }
    });

    document.getElementById('copy-final-cmd').addEventListener('click', () => {
        const text = document.getElementById('final-cmd').textContent;
        navigator.clipboard.writeText(text);
        showCopied(document.getElementById('copy-final-cmd'));
    });
}

// ─── Copy Helpers ────────────────────────────────────────
function setupCopy() {
    document.getElementById('copy-cmd').addEventListener('click', () => {
        const text = document.querySelector('#preview-command code').textContent;
        navigator.clipboard.writeText(text);
        showCopied(document.getElementById('copy-cmd'));
    });

    document.getElementById('copy-install').addEventListener('click', () => {
        navigator.clipboard.writeText('npm i -g git-commit-painter');
        showCopied(document.getElementById('copy-install'));
    });
}

function showCopied(btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
}

// ─── Toast ───────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initHeroGrid();
    initCanvas();
    initShadePicker();
    initGitHub();
    renderPreview();
    setupCopy();

    document.getElementById('preview-input').addEventListener('input', renderPreview);
    document.getElementById('invert-toggle').addEventListener('change', renderPreview);
    document.getElementById('intensity-select').addEventListener('change', renderPreview);

    document.getElementById('clear-canvas').addEventListener('click', clearCanvas);
    document.getElementById('export-json').addEventListener('click', exportJSON);

    document.getElementById('import-json').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const pattern = JSON.parse(ev.target.result);
                if (!Array.isArray(pattern) || pattern.length !== ROWS) {
                    showToast('Invalid pattern: must be an array of 7 rows.');
                    return;
                }
                clearCanvas();
                const cells = document.querySelectorAll('.canvas-cell');
                for (let day = 0; day < ROWS; day++) {
                    const row = pattern[day].replace(/ /g, '0');
                    for (let week = 0; week < Math.min(row.length, WEEKS); week++) {
                        const val = Math.min(parseInt(row[week]) || 0, 4);
                        canvasData[week][day] = val;
                        const idx = week * ROWS + day;
                        if (cells[idx]) {
                            cells[idx].className = 'canvas-cell' + (val > 0 ? ` g${val}` : '');
                        }
                    }
                }
                showToast('Pattern loaded!');
            } catch (err) {
                showToast('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    document.getElementById('send-to-canvas').addEventListener('click', () => {
        const text = document.getElementById('preview-input').value;
        const invert = document.getElementById('invert-toggle').checked;
        const multiplier = parseInt(document.getElementById('intensity-select').value);
        const grid = textToGrid(text, invert, multiplier);
        loadTextToCanvas(grid);
        document.getElementById('canvas').scrollIntoView({ behavior: 'smooth' });
    });
});
