const socket = io();

// rest of your code...
socket.on("progress", (data) => {
    console.log(data);
});

// ─── DOM refs ────────────────────────────────────────────────────────────────
const logs = document.getElementById("logs");
const logCount = document.getElementById("logCount");
const status = document.getElementById("status");
const result = document.getElementById("result");
const btn = document.getElementById("startBtn");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");

const meetingId = btn?.dataset?.id;
if (!meetingId) alert("Meeting ID missing");

// ─── Styles ──────────────────────────────────────────────────────────────────
const styleEl = document.createElement("style");
styleEl.textContent = `
    :root {
        --primary:        #2563eb;
        --primary-dark:   #1d4ed8;
        --primary-light:  #eff6ff;
        --success:        #16a34a;
        --success-bg:     #f0fdf4;
        --success-border: #bbf7d0;
        --danger:         #dc2626;
        --danger-bg:      #fef2f2;
        --danger-border:  #fecaca;
        --warning:        #d97706;
        --warning-bg:     #fffbeb;
        --text-primary:   #111827;
        --text-secondary: #6b7280;
        --text-muted:     #9ca3af;
        --surface:        #ffffff;
        --surface-alt:    #f9fafb;
        --border:         #e5e7eb;
        --border-strong:  #d1d5db;
        --radius-sm:      6px;
        --radius-md:      10px;
        --radius-lg:      14px;
        --shadow-sm:      0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05);
        --shadow-md:      0 4px 12px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06);
        --font:           'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        --mono:           'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
        --transition:     .18s ease;
    }

    @media (prefers-color-scheme: dark) {
        :root {
            --primary:        #3b82f6;
            --primary-dark:   #2563eb;
            --primary-light:  #1e3a5f;
            --success:        #22c55e;
            --success-bg:     #052e16;
            --success-border: #166534;
            --danger:         #f87171;
            --danger-bg:      #2d0a0a;
            --danger-border:  #991b1b;
            --warning:        #fbbf24;
            --warning-bg:     #1c1407;
            --text-primary:   #f9fafb;
            --text-secondary: #9ca3af;
            --text-muted:     #6b7280;
            --surface:        #1f2937;
            --surface-alt:    #111827;
            --border:         #374151;
            --border-strong:  #4b5563;
        }
    }

    /* ── Status badge ──────────────────────────────────── */
    #status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: var(--radius-md);
        font-family: var(--font);
        font-size: 13px;
        font-weight: 500;
        letter-spacing: .01em;
        border: 1px solid transparent;
        transition: background var(--transition), color var(--transition), border-color var(--transition);
    }
    #status.status-idle {
        background: var(--surface-alt);
        color: var(--text-secondary);
        border-color: var(--border);
    }
    #status.processing {
        background: var(--primary-light);
        color: var(--primary);
        border-color: color-mix(in srgb, var(--primary) 25%, transparent);
    }
    #status.done {
        background: var(--success-bg);
        color: var(--success);
        border-color: var(--success-border);
    }
    #status.failed {
        background: var(--danger-bg);
        color: var(--danger);
        border-color: var(--danger-border);
    }
    #status i { font-size: 14px; }

    /* ── Loader ────────────────────────────────────────── */
    #loader {
        display: none;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        margin-top: 14px;
        background: var(--surface-alt);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        font-family: var(--font);
    }
    .loader-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid var(--border-strong);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin .75s linear infinite;
        flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #loaderText {
        font-size: 13px;
        color: var(--text-secondary);
        font-family: var(--font);
    }

    /* ── Log pane ──────────────────────────────────────── */
    #logs {
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: var(--radius-md);
        padding: 12px 14px;
        font-family: var(--mono);
        font-size: 12px;
        line-height: 1.7;
        max-height: 200px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #30363d #0d1117;
    }
    #logs::-webkit-scrollbar       { width: 5px; }
    #logs::-webkit-scrollbar-track { background: #0d1117; }
    #logs::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }

    .log-line {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        padding: 1px 0;
    }
    .log-prefix  { color: #3d4451; user-select: none; }
    .log-ts      { color: #3d4451; font-size: 11px; min-width: 62px; padding-top: 1px; flex-shrink: 0; }
    .log-msg     { flex: 1; }
    .log-info    { color: #58a6ff; }
    .log-success { color: #3fb950; }
    .log-warning { color: #d29922; }
    .log-error   { color: #f85149; }

    /* ── Log count badge ───────────────────────────────── */
    .log-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 18px;
        padding: 0 6px;
        background: #30363d;
        color: #8b949e;
        border-radius: 20px;
        font-size: 11px;
        font-family: var(--mono);
        margin-left: 6px;
    }

    /* ── Transcript card ───────────────────────────────── */
    .transcript-card {
        margin-top: 18px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        font-family: var(--font);
    }
    .transcript-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--success-bg);
        border-bottom: 1px solid var(--success-border);
    }
    .transcript-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--success);
        text-transform: uppercase;
        letter-spacing: .05em;
    }
    .transcript-header i { font-size: 15px; }
    .transcript-body {
        padding: 16px;
        font-size: 14px;
        line-height: 1.75;
        color: var(--text-primary);
        white-space: pre-wrap;
        word-break: break-word;
    }
    .transcript-footer {
    padding: 14px 16px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: center;
    background: var(--surface-alt);
}
.btn-expand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-size: 13.5px;
    font-weight: 600;
    border-radius: var(--radius-md);
    border: none;
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
    color: #ffffff;
    cursor: pointer;
    transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
    font-family: var(--font);
    text-decoration: none;
    letter-spacing: .02em;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.35);
}
.btn-expand:hover {
    background: linear-gradient(135deg, #15803d 0%, #166534 100%);
    box-shadow: 0 4px 16px rgba(22, 163, 74, 0.45);
    transform: translateY(-1px);
}
.btn-expand:active {
    transform: translateY(0px);
    box-shadow: 0 2px 6px rgba(22, 163, 74, 0.3);
}
.btn-expand i {
    font-size: 14px;
}

    /* ── Error card (refined) ──────────────────────────── */
    .error-card {
        margin-top: 18px;
        background: var(--surface);
        border: 1px solid var(--danger-border);
        border-radius: var(--radius-lg);
        padding: 18px 20px;
        font-family: var(--font);
        box-shadow: var(--shadow-sm);
        position: relative;
        overflow: hidden;
    }
    .error-card::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 3px;
        background: var(--danger);
    }

    .error-header {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 6px;
        letter-spacing: -.01em;
    }
    .error-header .error-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 8px;
        background: var(--danger-bg);
        color: var(--danger);
        font-size: 13px;
        flex-shrink: 0;
    }

    .error-sub {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0 0 16px;
        line-height: 1.55;
        padding-left: 36px;
    }

    .btn-retry {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        height: 34px;
        padding: 0 16px;
        font-size: 12.5px;
        font-weight: 600;
        letter-spacing: .01em;
        border-radius: 7px;
        border: 1px solid var(--border-strong);
        background: var(--surface);
        color: var(--text-primary);
        cursor: pointer;
        font-family: var(--font);
        box-shadow: 0 1px 2px rgba(0,0,0,.04);
        transition: background var(--transition), border-color var(--transition),
                    box-shadow var(--transition), transform .1s ease;
    }
    .btn-retry i {
        font-size: 12px;
        color: var(--danger);
    }
    .btn-retry:hover {
        background: var(--surface-alt);
        border-color: var(--danger);
        box-shadow: 0 2px 6px rgba(0,0,0,.06);
    }
    .btn-retry:active {
        transform: scale(.97);
        box-shadow: none;
    }
    .btn-retry:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger) 25%, transparent);
    }

    /* ── Start button ──────────────────────────────────── */
    #startBtn {
        transition: opacity var(--transition), transform var(--transition);
    }
    #startBtn:disabled {
        opacity: .5;
        cursor: not-allowed;
        pointer-events: none;
    }
`;
document.head.appendChild(styleEl);

// ─── Init ────────────────────────────────────────────────────────────────────
loader.style.display = "none";
let logLineCount = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ts() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function addLog(text, type = "info") {
    const line = document.createElement("div");
    line.className = "log-line";
    line.innerHTML = `
        <span class="log-prefix">›</span>
        <span class="log-ts">${ts()}</span>
        <span class="log-msg log-${type}">${text}</span>
    `;
    logs.appendChild(line);
    logs.scrollTop = logs.scrollHeight;
    if (logCount) logCount.textContent = ++logLineCount;
}

function setStatus(icon, text, cls) {
    status.className = cls;
    status.innerHTML = `<i class="fa-solid ${icon}"></i> ${text}`;
}

function escHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function resetUI() {
    logs.innerHTML = "";
    result.innerHTML = "";
    logLineCount = 0;
    if (logCount) logCount.textContent = "0";
    loader.style.display = "none";
    loaderText.textContent = "Initialising...";
    btn.disabled = false;
    setStatus("fa-circle-dot", "Ready to process audio", "status-idle");
}

// ─── Socket listener (registered ONCE, not inside startTranscription) ───────
socket.off("progress");
socket.on("progress", (data) => {
    addLog(data.step, data.status);
});

// ─── Core pipeline ───────────────────────────────────────────────────────────
async function startTranscription() {
    btn.disabled = true;
    result.innerHTML = "";
    logs.innerHTML = "";
    logLineCount = 0;
    if (logCount) logCount.textContent = "0";

    loader.style.display = "flex";
    loaderText.textContent = "Initialising transcription engine...";

    setStatus("fa-brain fa-spin", "Processing started...", "processing");

    socket.emit("join-job", meetingId);

    const slowTimer = setTimeout(() => {
        loaderText.textContent = "Still working — large file or slow network...";
        addLog("Processing is taking longer than expected", "warning");
    }, 9000);

    try {
        const res = await fetch(`/meetings/${meetingId}/transcribe`, { method: "POST" });
        const data = await res.json();

        clearTimeout(slowTimer);
        loader.style.display = "none";

        if (!res.ok || !data.success) {
            throw new Error(data.error || data.message || "Server returned failure");
        }

        setStatus("fa-circle-check", "Transcription completed", "done");
        addLog("Pipeline finished — transcript ready", "success");

        result.innerHTML = `
            <div class="transcript-card">
                <div class="transcript-header">
                    <div class="transcript-header-left">
                        <i class="fa-solid fa-circle-check"></i>
                        Transcription Complete
                    </div>
                </div>
                <div class="transcript-body">
                    Your meeting has been transcribed and analysed successfully.
                </div>
                <div class="transcript-footer">
                    <a href="/meeting-history" class="btn-expand">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                        View in Meeting History
                    </a>
                </div>
            </div>
        `;

        btn.disabled = false;

    } catch (err) {
        clearTimeout(slowTimer);
        loader.style.display = "none";

        setStatus("fa-triangle-exclamation", "Transcription failed", "failed");
        addLog(`Error: ${err.message || "Unknown failure"}`, "error");

        result.innerHTML = `
            <div class="error-card">
                <div class="error-header">
                    <span class="error-icon"><i class="fa-solid fa-circle-xmark"></i></span>
                    Something went wrong
                </div>
                <p class="error-sub">
                    The transcription pipeline encountered an error. Check the logs above for details.
                </p>
                <button class="btn-retry" id="retryBtn">
                    <i class="fa-solid fa-rotate-right"></i>
                    Retry
                </button>
            </div>
        `;

        document.getElementById("retryBtn").addEventListener("click", () => {
            addLog("Retry triggered by user", "warning");
            resetUI();
            startTranscription();
        });

        btn.disabled = false;
    }
}

// ─── Boot ────────────────────────────────────────────────────────────────────
btn.addEventListener("click", startTranscription);