document.addEventListener("DOMContentLoaded", () => {
    // --- 1. НАСТРОЙКИ И ПЕРЕМЕННЫЕ ---
    const CONFIG = {
        dwellTime: 2000,
        magnetStrength: 80
    };
    let selectedItem = null;

    // --- 2. УНИВЕРСАЛЬНЫЙ АВТОКЛИК И МАГНИТ ---
    const interactiveElements = document.querySelectorAll(
        'button, .btn, .links a, .drag-item, .auto-target'
    );

    interactiveElements.forEach(btn => {
        if (!btn.querySelector('.dwell-progress')) {
            const bar = document.createElement('div');
            bar.className = 'dwell-progress';
            btn.appendChild(bar);
        }

        let timer;

        btn.addEventListener('mouseenter', () => {
            playTone(440);

            timer = setTimeout(() => {
                btn.style.transform = "scale(0.95)";
                setTimeout(() => btn.style.transform = "", 150);
                btn.click();
            }, CONFIG.dwellTime);
        });

        btn.addEventListener('mouseleave', () => {
            clearTimeout(timer);
            btn.style.transform = "";
        });
    });

    // --- 3. МАГНИТНЫЙ ЭФФЕКТ ---
    document.addEventListener("mousemove", e => {
        interactiveElements.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            const btnX = rect.left + rect.width / 2;
            const btnY = rect.top + rect.height / 2;
            const distance = Math.hypot(btnX - e.clientX, btnY - e.clientY);

            if (distance < CONFIG.magnetStrength) {
                btn.style.transform = `
                    translate(
                        ${(e.clientX - btnX) * 0.4}px,
                        ${(e.clientY - btnY) * 0.4}px
                    ) scale(1.1)
                `;
            }
        });
    });

    // --- 4. ЛОГИКА ИГРЫ ---
    const drags = document.querySelectorAll(".drag-item");
    const slots = document.querySelectorAll(".drop-slot");

    drags.forEach(drag => {
        drag.addEventListener("dragstart", e =>
            e.dataTransfer.setData("text", drag.id)
        );

        drag.addEventListener("click", () => {
            drags.forEach(d => d.style.border = "2px solid #3498db");
            selectedItem = drag;
            drag.style.border = "5px solid #f1c40f";
        });
    });

    slots.forEach(slot => {
        slot.addEventListener("dragover", e => e.preventDefault());

        slot.addEventListener("drop", e => {
            e.preventDefault();
            const dragId = e.dataTransfer.getData("text");
            handleGameLogic(document.getElementById(dragId), slot);
        });

        slot.addEventListener("click", () => {
            if (selectedItem) handleGameLogic(selectedItem, slot);
        });
    });

    function handleGameLogic(item, slot) {
        if (item.innerText === slot.dataset.correct) {
            slot.innerText = item.innerText;
            slot.classList.add("filled");
            item.style.visibility = "hidden";
            sendResult(true);
            showConfetti();
            selectedItem = null;
        } else {
            sendResult(false);
        }
    }

    // --- 5. ГОРЯЧИЕ КЛАВИШИ ---
    document.addEventListener("keydown", e => {
        if (e.key === "Enter") sendResult(true);
        if (e.key === "Escape") sendResult(false);
    });
});


function playCoquiVoice(success) {
    const audio = new Audio("/audio/shrek1.mp3");

    audio.volume = 1.0;
    audio.play().catch(err => {
        console.error("Ошибка воспроизведения аудио:", err);
    });
}

async function sendResult(success) {
    if (window.isProcessingResult) return;
    window.isProcessingResult = true;

    playCoquiVoice(success);

    await fetch("/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success })
    });

    showPraise(success);
    setTimeout(() => window.isProcessingResult = false, 1000);
}


// ================== 🔊 ЗВУК НАВЕДЕНИЯ ==================

function playTone(freq) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}


// ================== 💬 ТЕКСТОВАЯ ПОХВАЛА ==================

function showPraise(success) {
    const messages = success
        ? ["Отлично! 🌟"]
        : ["Ничего страшного 💙", "Ты стараешься!", "Попробуем ещё раз 🙂"];

    alert(messages[Math.floor(Math.random() * messages.length)]);
}


// ================== 🎨 ТЕМА ==================

(function applyTheme() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
    if (localStorage.getItem("largeMode") === "true") {
        document.body.classList.add("large-mode");
    }
})();

function toggleDarkMode() {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");

    fetch("/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dark_mode: isDark })
    });
}


// ================== 🎉 КОНФЕТТИ ==================

function showConfetti() {
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement("div");
        confetti.className = "confetti-piece";
        confetti.style.left = Math.random() * window.innerWidth + "px";
        confetti.style.backgroundColor =
            `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.animationDelay = Math.random() * 0.5 + "s";
        confetti.style.animationDuration = (0.7 + Math.random()) + "s";

        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }
}

let lastClickTime = 0;
const clickDebounceTime = 1000;

document.addEventListener('click', (e) => {
    const currentTime = new Date().getTime();
    if (currentTime - lastClickTime < clickDebounceTime) {
        e.preventDefault();
        e.stopPropagation();
    } else {
        lastClickTime = currentTime;
    }
}, True);