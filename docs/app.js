/**
 * PDF2QUIZ 題庫練習系統
 */

// LocalStorage 鍵名
const STORAGE_KEY = 'pdf2quiz_custom_banks';
const TRANSLATE_PREF_KEY = 'pdf2quiz_translate_enabled';
const PRACTICE_HISTORY_KEY = 'pdf2quiz_practice_history';

// 狀態管理
const state = {
    banks: [],              // 所有題庫
    customBanks: [],        // 自訂題庫（localStorage）
    currentBank: null,      // 當前題庫
    questions: [],          // 當前測驗題目
    currentIndex: 0,        // 當前題號
    userAnswers: {},        // 使用者答案
    answered: false,        // 當前題是否已作答
    translateEnabled: false, // 翻譯開關
    translationCache: {},   // 翻譯快取
    practiceHistory: {},    // 練習記錄
    quizMode: 'normal',     // 測驗模式：normal（一般）/ wrong（錯題練習）
    settings: {
        shuffleQuestions: true,
        shuffleOptions: true
    }
};

// 翻譯 API（使用 Google Translate 免費端點）
async function translateText(text, targetLang = 'zh-TW') {
    if (!text || text.trim().length === 0) return '';

    // 檢查快取
    const cacheKey = `${text}_${targetLang}`;
    if (state.translationCache[cacheKey]) {
        return state.translationCache[cacheKey];
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();

        // 解析回應格式
        let translated = '';
        if (data && data[0]) {
            data[0].forEach(item => {
                if (item[0]) {
                    translated += item[0];
                }
            });
        }

        // 儲存到快取
        if (translated) {
            state.translationCache[cacheKey] = translated;
        }

        return translated || text;
    } catch (error) {
        console.warn('翻譯失敗:', error);
        return text;
    }
}

// 批次翻譯
async function translateBatch(texts, targetLang = 'zh-TW') {
    const results = await Promise.all(
        texts.map(text => translateText(text, targetLang))
    );
    return results;
}

// DOM 元素快取
const $ = id => document.getElementById(id);

const els = {
    // 螢幕
    homeScreen: $('home-screen'),
    quizScreen: $('quiz-screen'),
    resultScreen: $('result-screen'),
    reviewScreen: $('review-screen'),
    viewScreen: $('view-screen'),
    // 導航
    navHome: $('nav-home'),
    navQuiz: $('nav-quiz'),
    currentBank: $('current-bank'),
    // 首頁
    bankList: $('bank-list'),
    fileInput: $('file-input'),
    quizSetup: $('quiz-setup'),
    selectedBankName: $('selected-bank-name'),
    selectedBankCount: $('selected-bank-count'),
    customCount: $('custom-count'),
    shuffleQuestions: $('shuffle-questions'),
    shuffleOptions: $('shuffle-options'),
    btnStart: $('btn-start'),
    // 題目 ID 搜尋
    searchIdInput: $('search-id-input'),
    btnSearchId: $('btn-search-id'),
    // 練習記錄區
    practiceStats: $('practice-stats'),
    statPracticed: $('stat-practiced'),
    statWrongCount: $('stat-wrong-count'),
    btnPracticeWrong: $('btn-practice-wrong'),
    btnClearHistory: $('btn-clear-history'),
    // 格式說明 Modal
    btnShowFormat: $('btn-show-format'),
    formatModal: $('format-modal'),
    btnCloseModal: $('btn-close-modal'),
    // 測驗
    progressText: $('progress-text'),
    progressFill: $('progress-fill'),
    btnEndQuiz: $('btn-end-quiz'),
    questionType: $('question-type'),
    questionText: $('question-text'),
    questionId: $('question-id'),
    optionsContainer: $('options-container'),
    feedback: $('feedback'),
    feedbackMessage: $('feedback-message'),
    correctAnswer: $('correct-answer'),
    explanation: $('explanation'),
    btnPrev: $('btn-prev'),
    btnSubmit: $('btn-submit'),
    btnNext: $('btn-next'),
    btnToggleTranslate: $('btn-toggle-translate'),
    // 結果
    scoreRing: $('score-ring'),
    scorePercent: $('score-percent'),
    statCorrect: $('stat-correct'),
    statIncorrect: $('stat-incorrect'),
    statTotal: $('stat-total'),
    btnReview: $('btn-review'),
    btnRetry: $('btn-retry'),
    btnHome: $('btn-home'),
    // 錯題
    reviewList: $('review-list'),
    btnBackResult: $('btn-back-result'),
    // 單題查看
    viewQuestion: $('view-question'),
    btnBackHome: $('btn-back-home')
};

// 工具函數
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 顯示指定畫面
function showScreen(name) {
    ['home', 'quiz', 'result', 'review', 'view'].forEach(s => {
        const el = $(`${s}-screen`);
        if (el) el.classList.toggle('hidden', s !== name);
    });
    els.navHome.classList.toggle('active', name === 'home' || name === 'view');
    els.navQuiz.classList.toggle('active', name === 'quiz');
    els.navQuiz.disabled = name !== 'quiz';
}

// LocalStorage 操作
function loadCustomBanksFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            state.customBanks = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('無法讀取自訂題庫:', e);
        state.customBanks = [];
    }
}

function saveCustomBanksToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.customBanks));
    } catch (e) {
        console.warn('無法儲存自訂題庫:', e);
        // 可能是 localStorage 已滿
        if (e.name === 'QuotaExceededError') {
            alert('瀏覽器儲存空間已滿，無法儲存更多題庫。請刪除部分自訂題庫後重試。');
        }
    }
}

function loadTranslatePreference() {
    try {
        const pref = localStorage.getItem(TRANSLATE_PREF_KEY);
        state.translateEnabled = pref === 'true';
    } catch (e) {
        state.translateEnabled = false;
    }
}

function saveTranslatePreference() {
    try {
        localStorage.setItem(TRANSLATE_PREF_KEY, state.translateEnabled.toString());
    } catch (e) {
        console.warn('無法儲存翻譯偏好:', e);
    }
}

// 讀取練習記錄
function loadPracticeHistory() {
    try {
        const stored = localStorage.getItem(PRACTICE_HISTORY_KEY);
        if (stored) {
            state.practiceHistory = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('無法讀取練習記錄:', e);
        state.practiceHistory = {};
    }
}

// 儲存練習記錄
function savePracticeHistory() {
    try {
        localStorage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(state.practiceHistory));
    } catch (e) {
        console.warn('無法儲存練習記錄:', e);
        if (e.name === 'QuotaExceededError') {
            alert('瀏覽器儲存空間已滿，無法儲存練習記錄。');
        }
    }
}

// 記錄單題練習結果
function recordPractice(bankName, questionId, isCorrect, userAnswer) {
    if (!state.practiceHistory[bankName]) {
        state.practiceHistory[bankName] = {};
    }
    if (!state.practiceHistory[bankName][questionId]) {
        state.practiceHistory[bankName][questionId] = {
            practiceCount: 0,
            correctCount: 0,
            wrongCount: 0,
            lastPracticed: null,
            history: []
        };
    }

    const record = state.practiceHistory[bankName][questionId];
    record.practiceCount++;
    if (isCorrect) {
        record.correctCount++;
    } else {
        record.wrongCount++;
    }
    record.lastPracticed = new Date().toISOString();

    // 保留最近 10 次記錄
    record.history.unshift({
        timestamp: record.lastPracticed,
        isCorrect,
        userAnswer: userAnswer.join(',')
    });
    if (record.history.length > 10) {
        record.history = record.history.slice(0, 10);
    }

    savePracticeHistory();
}

// 取得題庫的練習統計
function getBankPracticeStats(bankName) {
    const bankHistory = state.practiceHistory[bankName] || {};
    const questionIds = Object.keys(bankHistory);
    let practicedCount = 0;
    let wrongQuestionIds = [];

    questionIds.forEach(qId => {
        const record = bankHistory[qId];
        if (record.practiceCount > 0) {
            practicedCount++;
            // 最近一次答錯的題目列入錯題
            if (record.history.length > 0 && !record.history[0].isCorrect) {
                wrongQuestionIds.push(parseInt(qId));
            }
        }
    });

    return { practicedCount, wrongQuestionIds };
}

// 清除題庫練習記錄
function clearBankPracticeHistory(bankName) {
    if (confirm(`確定要清除「${bankName}」的所有練習記錄嗎？`)) {
        delete state.practiceHistory[bankName];
        savePracticeHistory();
        updatePracticeStatsUI();
    }
}

// 更新練習統計 UI
function updatePracticeStatsUI() {
    if (!state.currentBank) {
        if (els.practiceStats) els.practiceStats.classList.add('hidden');
        return;
    }

    const { practicedCount, wrongQuestionIds } = getBankPracticeStats(state.currentBank.name);

    if (els.practiceStats) {
        els.practiceStats.classList.remove('hidden');
    }
    if (els.statPracticed) {
        els.statPracticed.textContent = practicedCount;
    }
    if (els.statWrongCount) {
        els.statWrongCount.textContent = wrongQuestionIds.length;
    }
    if (els.btnPracticeWrong) {
        els.btnPracticeWrong.disabled = wrongQuestionIds.length === 0;
    }
}

// 題庫管理
async function loadBanks() {
    // 從 localStorage 讀取自訂題庫和練習記錄
    loadCustomBanksFromStorage();
    loadTranslatePreference();
    loadPracticeHistory();

    // 從 banks.json 讀取題庫列表
    try {
        const resp = await fetch('./data/questions/banks.json');
        if (resp.ok) {
            const banks = await resp.json();
            for (const filename of banks) {
                await loadBank(filename);
            }
        }
    } catch (e) {
        console.warn('無法讀取題庫列表，請執行 python3 scripts/update_banks.py');
    }

    // 合併自訂題庫
    state.customBanks.forEach(bank => {
        const idx = state.banks.findIndex(b => b.name === bank.name);
        if (idx >= 0) {
            // 覆蓋同名題庫
            state.banks[idx] = { ...bank, isCustom: true };
        } else {
            state.banks.push({ ...bank, isCustom: true });
        }
    });

    renderBankList();
}

async function loadBank(filename) {
    try {
        const resp = await fetch(`./data/questions/${filename}`);
        if (resp.ok) {
            const text = await resp.text();
            const questions = parseJSONL(text);
            if (questions.length > 0) {
                const name = filename.replace('.jsonl', '');
                state.banks.push({ name, questions, count: questions.length });
            }
        }
    } catch (e) {
        console.warn('載入題庫失敗:', filename);
    }
}

function parseJSONL(text) {
    const lines = text.trim().split('\n');
    const questions = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const q = JSON.parse(line);
            if (q.question && q.options && q.answer) {
                questions.push(q);
            }
        } catch (e) {}
    }
    return questions;
}

function renderBankList() {
    els.bankList.innerHTML = '';
    state.banks.forEach((bank, idx) => {
        const div = document.createElement('div');
        div.className = 'bank-item';
        div.innerHTML = `
            <i data-lucide="${bank.isCustom ? 'upload-cloud' : 'file-text'}"></i>
            <span class="bank-name">${bank.name}</span>
            ${bank.isCustom ? '<span class="bank-badge">自訂</span>' : ''}
            <span class="bank-count">${bank.count} 題</span>
            ${bank.isCustom ? `<button class="bank-delete" data-idx="${idx}" title="刪除題庫"><i data-lucide="trash-2"></i></button>` : ''}
        `;
        div.onclick = (e) => {
            // 避免點擊刪除按鈕時選擇題庫
            if (!e.target.closest('.bank-delete')) {
                selectBank(idx);
            }
        };
        els.bankList.appendChild(div);
    });

    // 綁定刪除按鈕事件
    els.bankList.querySelectorAll('.bank-delete').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx);
            deleteCustomBank(idx);
        };
    });

    initIcons();
}

function deleteCustomBank(idx) {
    const bank = state.banks[idx];
    if (!bank || !bank.isCustom) return;

    if (confirm(`確定要刪除題庫「${bank.name}」嗎？`)) {
        // 從 customBanks 中移除
        const customIdx = state.customBanks.findIndex(b => b.name === bank.name);
        if (customIdx >= 0) {
            state.customBanks.splice(customIdx, 1);
            saveCustomBanksToStorage();
        }
        // 從 banks 中移除
        state.banks.splice(idx, 1);
        // 如果當前選中的題庫被刪除
        if (state.currentBank && state.currentBank.name === bank.name) {
            state.currentBank = null;
            els.quizSetup.classList.add('hidden');
            els.currentBank.textContent = '-';
        }
        renderBankList();
    }
}

function selectBank(idx) {
    state.currentBank = state.banks[idx];
    // UI
    document.querySelectorAll('.bank-item').forEach((el, i) => {
        el.classList.toggle('selected', i === idx);
    });
    els.quizSetup.classList.remove('hidden');
    els.selectedBankName.textContent = state.currentBank.name;
    els.selectedBankCount.textContent = `共 ${state.currentBank.count} 題`;
    els.currentBank.textContent = state.currentBank.name;
    // 更新自訂數量最大值
    els.customCount.max = state.currentBank.count;
    // 更新練習統計
    updatePracticeStatsUI();
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
        const questions = parseJSONL(evt.target.result);
        if (questions.length === 0) {
            alert('無法解析題庫，請確認格式正確。\n\n點擊「查看 JSONL 格式範例」了解正確格式。');
            return;
        }
        const name = file.name.replace('.jsonl', '');

        // 建立自訂題庫物件
        const customBank = { name, questions, count: questions.length, isCustom: true };

        // 更新 customBanks（儲存用）
        const customIdx = state.customBanks.findIndex(b => b.name === name);
        if (customIdx >= 0) {
            state.customBanks[customIdx] = customBank;
        } else {
            state.customBanks.push(customBank);
        }

        // 儲存到 localStorage
        saveCustomBanksToStorage();

        // 更新 banks（顯示用）
        const idx = state.banks.findIndex(b => b.name === name);
        if (idx >= 0) {
            state.banks[idx] = customBank;
        } else {
            state.banks.push(customBank);
        }

        renderBankList();
        selectBank(state.banks.findIndex(b => b.name === name));

        // 清空 input，允許重複上傳同一檔案
        e.target.value = '';
    };
    reader.readAsText(file);
}

// 測驗邏輯
function startQuiz() {
    if (!state.currentBank) return;

    // 設定
    state.settings.shuffleQuestions = els.shuffleQuestions.checked;
    state.settings.shuffleOptions = els.shuffleOptions.checked;
    state.quizMode = 'normal';

    // 題目數量
    const mode = document.querySelector('input[name="mode"]:checked').value;
    let count = state.currentBank.count;
    if (mode === '50') count = Math.min(50, count);
    else if (mode === 'custom') count = Math.min(parseInt(els.customCount.value) || 30, count);

    // 準備題目
    let questions = [...state.currentBank.questions];
    if (state.settings.shuffleQuestions) {
        questions = shuffle(questions);
    }
    questions = questions.slice(0, count);

    // 打亂選項
    if (state.settings.shuffleOptions) {
        questions = questions.map(q => shuffleOptions(q));
    }

    state.questions = questions;
    state.currentIndex = 0;
    state.userAnswers = {};
    state.answered = false;

    showScreen('quiz');
    renderQuestion();
}

// 錯題練習模式
function startWrongQuestionsPractice() {
    if (!state.currentBank) return;

    const { wrongQuestionIds } = getBankPracticeStats(state.currentBank.name);
    if (wrongQuestionIds.length === 0) {
        alert('目前沒有錯題可以練習！');
        return;
    }

    // 設定
    state.settings.shuffleQuestions = els.shuffleQuestions.checked;
    state.settings.shuffleOptions = els.shuffleOptions.checked;
    state.quizMode = 'wrong';

    // 從原題庫找出錯題
    let questions = state.currentBank.questions.filter(q => wrongQuestionIds.includes(q.id));

    if (state.settings.shuffleQuestions) {
        questions = shuffle(questions);
    }

    // 打亂選項
    if (state.settings.shuffleOptions) {
        questions = questions.map(q => shuffleOptions(q));
    }

    state.questions = questions;
    state.currentIndex = 0;
    state.userAnswers = {};
    state.answered = false;

    showScreen('quiz');
    renderQuestion();
}

function shuffleOptions(q) {
    const entries = Object.entries(q.options);
    const shuffled = shuffle(entries);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const newOpts = {};
    const mapping = {};

    shuffled.forEach((entry, i) => {
        const oldLetter = entry[0];
        const newLetter = letters[i];
        newOpts[newLetter] = entry[1];
        mapping[oldLetter] = newLetter;
    });

    return {
        ...q,
        options: newOpts,
        answer: q.answer.map(a => mapping[a])
    };
}

function renderQuestion() {
    const q = state.questions[state.currentIndex];
    const total = state.questions.length;

    // 進度
    els.progressText.textContent = `${state.currentIndex + 1} / ${total}`;
    els.progressFill.style.width = `${((state.currentIndex + 1) / total) * 100}%`;

    // 顯示題目 ID
    if (els.questionId) {
        els.questionId.textContent = q.id ? `#${q.id}` : '';
        els.questionId.classList.toggle('hidden', !q.id);
    }

    // 題型
    const isMulti = q.answer.length > 1;
    els.questionType.textContent = isMulti ? '多選題' : '';
    els.questionType.classList.toggle('hidden', !isMulti);

    // 翻譯按鈕狀態
    els.btnToggleTranslate.classList.toggle('active', state.translateEnabled);

    // 題目（雙語顯示）
    const originalEl = els.questionText.querySelector('.text-original');
    const translatedEl = els.questionText.querySelector('.text-translated');
    originalEl.textContent = q.question;

    // 選項
    els.optionsContainer.innerHTML = '';
    const letters = Object.keys(q.options).sort();
    letters.forEach(letter => {
        const div = document.createElement('div');
        div.className = 'option';
        div.dataset.letter = letter;
        div.innerHTML = `
            <span class="option-letter">${letter}</span>
            <div class="option-content">
                <span class="option-original">${q.options[letter]}</span>
                <span class="option-translated hidden"></span>
            </div>
        `;
        div.onclick = () => selectOption(letter);
        els.optionsContainer.appendChild(div);
    });

    // 如果翻譯已啟用，進行翻譯
    if (state.translateEnabled) {
        showTranslation();
    } else {
        translatedEl.classList.add('hidden');
        els.optionsContainer.querySelectorAll('.option-translated').forEach(el => {
            el.classList.add('hidden');
        });
    }

    // 恢復先前選擇
    const prev = state.userAnswers[state.currentIndex];
    if (prev) {
        prev.forEach(l => {
            const el = els.optionsContainer.querySelector(`[data-letter="${l}"]`);
            if (el) el.classList.add('selected');
        });
    }

    // 重置
    els.feedback.classList.add('hidden');
    els.feedback.classList.remove('correct', 'incorrect');
    els.explanation.classList.add('hidden');
    state.answered = false;
    updateNavButtons();
}

// 顯示翻譯
async function showTranslation() {
    const q = state.questions[state.currentIndex];
    const translatedEl = els.questionText.querySelector('.text-translated');

    // 顯示載入中
    translatedEl.classList.remove('hidden');
    translatedEl.classList.add('loading');
    translatedEl.textContent = '翻譯中...';

    // 翻譯題目
    const translatedQuestion = await translateText(q.question);
    translatedEl.classList.remove('loading');
    translatedEl.textContent = translatedQuestion;

    // 翻譯選項
    const letters = Object.keys(q.options).sort();
    const optionTexts = letters.map(l => q.options[l]);

    // 同時顯示載入中
    els.optionsContainer.querySelectorAll('.option-translated').forEach(el => {
        el.classList.remove('hidden');
        el.classList.add('loading');
        el.textContent = '翻譯中...';
    });

    // 批次翻譯選項
    const translatedOptions = await translateBatch(optionTexts);

    // 更新翻譯結果
    els.optionsContainer.querySelectorAll('.option').forEach((optEl, idx) => {
        const transEl = optEl.querySelector('.option-translated');
        transEl.classList.remove('loading');
        transEl.textContent = translatedOptions[idx];
    });
}

// 隱藏翻譯
function hideTranslation() {
    const translatedEl = els.questionText.querySelector('.text-translated');
    translatedEl.classList.add('hidden');
    els.optionsContainer.querySelectorAll('.option-translated').forEach(el => {
        el.classList.add('hidden');
    });
}

// 切換翻譯
function toggleTranslation() {
    state.translateEnabled = !state.translateEnabled;
    els.btnToggleTranslate.classList.toggle('active', state.translateEnabled);
    saveTranslatePreference();

    if (state.translateEnabled) {
        showTranslation();
    } else {
        hideTranslation();
    }
}

function selectOption(letter) {
    if (state.answered) return;

    const q = state.questions[state.currentIndex];
    const isMulti = q.answer.length > 1;

    if (!state.userAnswers[state.currentIndex]) {
        state.userAnswers[state.currentIndex] = [];
    }

    const ans = state.userAnswers[state.currentIndex];
    const idx = ans.indexOf(letter);

    if (isMulti) {
        if (idx >= 0) ans.splice(idx, 1);
        else ans.push(letter);
    } else {
        state.userAnswers[state.currentIndex] = [letter];
    }

    // 更新 UI
    els.optionsContainer.querySelectorAll('.option').forEach(el => {
        const l = el.dataset.letter;
        el.classList.toggle('selected', state.userAnswers[state.currentIndex].includes(l));
    });

    updateNavButtons();
}

function submitAnswer() {
    const ans = state.userAnswers[state.currentIndex] || [];
    if (ans.length === 0) return;

    state.answered = true;
    const q = state.questions[state.currentIndex];
    const correct = q.answer.sort().join('') === ans.sort().join('');

    // 記錄練習結果
    if (state.currentBank && q.id) {
        recordPractice(state.currentBank.name, q.id, correct, ans);
    }

    // 標記選項
    els.optionsContainer.querySelectorAll('.option').forEach(el => {
        el.classList.add('disabled');
        const l = el.dataset.letter;
        if (q.answer.includes(l)) el.classList.add('correct');
        if (ans.includes(l) && !q.answer.includes(l)) el.classList.add('incorrect');
    });

    // 回饋
    els.feedback.classList.remove('hidden', 'correct', 'incorrect');
    els.feedback.classList.add(correct ? 'correct' : 'incorrect');
    els.feedbackMessage.textContent = correct ? '答對了' : '答錯了';
    els.correctAnswer.textContent = correct ? '' : `正確答案：${q.answer.join(', ')}`;

    // 解釋
    if (q.explanation) {
        els.explanation.textContent = q.explanation;
        els.explanation.classList.remove('hidden');
    }

    updateNavButtons();
}

function updateNavButtons() {
    els.btnPrev.disabled = state.currentIndex === 0;

    const hasAns = (state.userAnswers[state.currentIndex] || []).length > 0;
    const isLast = state.currentIndex === state.questions.length - 1;

    if (state.answered) {
        els.btnSubmit.classList.add('hidden');
        els.btnNext.classList.remove('hidden');
        els.btnNext.textContent = isLast ? '查看結果' : '下一題';
    } else {
        els.btnSubmit.classList.remove('hidden');
        els.btnSubmit.disabled = !hasAns;
        els.btnNext.classList.add('hidden');
    }
}

function prevQuestion() {
    if (state.currentIndex > 0) {
        state.currentIndex--;
        state.answered = true; // 已作答過的題目
        renderQuestion();
        // 重新顯示結果
        showPreviousResult();
    }
}

function showPreviousResult() {
    const q = state.questions[state.currentIndex];
    const ans = state.userAnswers[state.currentIndex] || [];
    if (ans.length === 0) return;

    state.answered = true;
    const correct = q.answer.sort().join('') === ans.sort().join('');

    els.optionsContainer.querySelectorAll('.option').forEach(el => {
        el.classList.add('disabled');
        const l = el.dataset.letter;
        if (q.answer.includes(l)) el.classList.add('correct');
        if (ans.includes(l) && !q.answer.includes(l)) el.classList.add('incorrect');
    });

    els.feedback.classList.remove('hidden', 'correct', 'incorrect');
    els.feedback.classList.add(correct ? 'correct' : 'incorrect');
    els.feedbackMessage.textContent = correct ? '答對了' : '答錯了';
    els.correctAnswer.textContent = correct ? '' : `正確答案：${q.answer.join(', ')}`;

    if (q.explanation) {
        els.explanation.textContent = q.explanation;
        els.explanation.classList.remove('hidden');
    }

    updateNavButtons();
}

function nextQuestion() {
    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex++;
        state.answered = false;
        renderQuestion();
    } else {
        showResult();
    }
}

function endQuiz() {
    if (confirm('確定要結束測驗嗎？')) {
        showResult();
    }
}

function showResult() {
    let correct = 0, incorrect = 0;
    state.questions.forEach((q, i) => {
        const ans = state.userAnswers[i] || [];
        if (ans.length === 0) return;
        const isCorrect = q.answer.sort().join('') === ans.sort().join('');
        if (isCorrect) correct++;
        else incorrect++;
    });

    const total = correct + incorrect;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    els.scorePercent.textContent = percent;
    els.statCorrect.textContent = correct;
    els.statIncorrect.textContent = incorrect;
    els.statTotal.textContent = total;

    // 動畫
    const offset = 283 - (283 * percent / 100);
    setTimeout(() => {
        els.scoreRing.style.strokeDashoffset = offset;
    }, 100);

    // 更新練習統計
    updatePracticeStatsUI();

    showScreen('result');
}

function showReview() {
    els.reviewList.innerHTML = '';

    state.questions.forEach((q, i) => {
        const ans = state.userAnswers[i] || [];
        if (ans.length === 0) return;
        const isCorrect = q.answer.sort().join('') === ans.sort().join('');
        if (isCorrect) return; // 只顯示錯題

        const div = document.createElement('div');
        div.className = 'review-item';

        let optsHtml = '';
        Object.keys(q.options).sort().forEach(l => {
            let cls = '';
            if (q.answer.includes(l)) cls = 'correct';
            else if (ans.includes(l)) cls = 'user-wrong';
            const marker = q.answer.includes(l) ? ' (正確)' : (ans.includes(l) ? ' (你的選擇)' : '');
            optsHtml += `<div class="review-opt ${cls}">${l}. ${q.options[l]}${marker}</div>`;
        });

        div.innerHTML = `
            <div class="review-q-num">題目 ${i + 1}</div>
            <div class="review-q-text">${q.question}</div>
            <div class="review-options">${optsHtml}</div>
            ${q.explanation ? `<div class="review-explanation">${q.explanation}</div>` : ''}
        `;

        els.reviewList.appendChild(div);
    });

    if (els.reviewList.children.length === 0) {
        els.reviewList.innerHTML = '<p style="text-align:center;color:var(--success)">太棒了，全部答對！</p>';
    }

    showScreen('review');
}

function retry() {
    els.scoreRing.style.strokeDashoffset = 283;
    startQuiz();
}

function goHome() {
    els.scoreRing.style.strokeDashoffset = 283;
    showScreen('home');
    // 更新練習統計
    updatePracticeStatsUI();
}

// 搜尋指定題目 ID
function searchQuestionById() {
    if (!state.currentBank) {
        alert('請先選擇一個題庫！');
        return;
    }

    const inputValue = els.searchIdInput?.value?.trim();
    if (!inputValue) {
        alert('請輸入題目 ID！');
        return;
    }

    const targetId = parseInt(inputValue);
    if (isNaN(targetId)) {
        alert('請輸入有效的數字 ID！');
        return;
    }

    const question = state.currentBank.questions.find(q => q.id === targetId);
    if (!question) {
        alert(`在「${state.currentBank.name}」中找不到 ID 為 ${targetId} 的題目！`);
        return;
    }

    // 顯示單題查看畫面
    showViewQuestion(question);
}

// 顯示單題查看畫面
function showViewQuestion(question) {
    showScreen('view');

    const container = els.viewQuestion;
    if (!container) return;

    // 取得練習記錄
    let practiceInfo = '';
    if (state.currentBank && question.id) {
        const bankHistory = state.practiceHistory[state.currentBank.name] || {};
        const record = bankHistory[question.id];
        if (record && record.practiceCount > 0) {
            practiceInfo = `
                <div class="view-practice-info">
                    <i data-lucide="bar-chart-2"></i>
                    <span>練習次數：${record.practiceCount}</span>
                    <span class="correct">答對：${record.correctCount}</span>
                    <span class="incorrect">答錯：${record.wrongCount}</span>
                    <span class="last-time">最後練習：${formatDate(record.lastPracticed)}</span>
                </div>
            `;
        }
    }

    // 建立選項 HTML
    let optsHtml = '';
    Object.keys(question.options).sort().forEach(l => {
        const isCorrect = question.answer.includes(l);
        optsHtml += `
            <div class="view-option ${isCorrect ? 'correct' : ''}">
                <span class="option-letter">${l}</span>
                <span class="option-text">${question.options[l]}</span>
                ${isCorrect ? '<span class="answer-badge">正確答案</span>' : ''}
            </div>
        `;
    });

    container.innerHTML = `
        <div class="view-header">
            <span class="view-id">#${question.id || '-'}</span>
            ${question.topic ? `<span class="view-topic">Topic ${question.topic}</span>` : ''}
            ${question.answer.length > 1 ? '<span class="view-type">多選題</span>' : ''}
        </div>
        ${practiceInfo}
        <div class="view-question-text">${question.question}</div>
        <div class="view-options">${optsHtml}</div>
        ${question.explanation ? `<div class="view-explanation"><i data-lucide="lightbulb"></i><span>${question.explanation}</span></div>` : ''}
    `;

    initIcons();
}

// 格式化日期
function formatDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    // 小於 1 分鐘
    if (diff < 60000) return '剛剛';
    // 小於 1 小時
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
    // 小於 24 小時
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
    // 小於 7 天
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    // 其他
    return date.toLocaleDateString('zh-TW');
}

// 事件綁定
function initEvents() {
    els.fileInput.addEventListener('change', handleFileUpload);

    // 模式選擇
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', e => {
            els.customCount.disabled = e.target.value !== 'custom';
        });
    });

    // 格式說明 Modal
    els.btnShowFormat.addEventListener('click', () => {
        els.formatModal.classList.remove('hidden');
        initIcons();
    });
    els.btnCloseModal.addEventListener('click', () => {
        els.formatModal.classList.add('hidden');
    });
    els.formatModal.querySelector('.modal-overlay').addEventListener('click', () => {
        els.formatModal.classList.add('hidden');
    });

    // 翻譯切換
    els.btnToggleTranslate.addEventListener('click', toggleTranslation);

    // 題目 ID 搜尋
    if (els.btnSearchId) {
        els.btnSearchId.addEventListener('click', searchQuestionById);
    }
    if (els.searchIdInput) {
        els.searchIdInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') searchQuestionById();
        });
    }

    // 錯題練習
    if (els.btnPracticeWrong) {
        els.btnPracticeWrong.addEventListener('click', startWrongQuestionsPractice);
    }

    // 清除練習記錄
    if (els.btnClearHistory) {
        els.btnClearHistory.addEventListener('click', () => {
            if (state.currentBank) {
                clearBankPracticeHistory(state.currentBank.name);
            }
        });
    }

    // 返回首頁（從單題查看畫面）
    if (els.btnBackHome) {
        els.btnBackHome.addEventListener('click', goHome);
    }

    els.btnStart.addEventListener('click', startQuiz);
    els.btnEndQuiz.addEventListener('click', endQuiz);
    els.btnPrev.addEventListener('click', prevQuestion);
    els.btnSubmit.addEventListener('click', submitAnswer);
    els.btnNext.addEventListener('click', nextQuestion);
    els.btnReview.addEventListener('click', showReview);
    els.btnRetry.addEventListener('click', retry);
    els.btnHome.addEventListener('click', goHome);
    els.btnBackResult.addEventListener('click', () => showScreen('result'));

    els.navHome.addEventListener('click', () => {
        if (state.questions.length > 0) {
            if (confirm('確定要離開測驗嗎？')) {
                goHome();
            }
        }
    });

    // ESC 關閉 Modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !els.formatModal.classList.contains('hidden')) {
            els.formatModal.classList.add('hidden');
        }
    });
}

// 初始化
// 初始化 Lucide 圖示
function initIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function init() {
    initEvents();
    await loadBanks();
    initIcons();
}

document.addEventListener('DOMContentLoaded', init);
