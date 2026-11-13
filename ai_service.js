// ==========================================
// ai_service.js : AIサービス ＆ 共通ユーティリティ（新モデル通知・削除管理機能付き）
// ==========================================

// --- 1. AIモデル定義 ＆ 設定 ---
const DEFAULT_AI_MODELS = [
    { label: "Gemini 3.5 Flash（標準）",       value: "Gemini 3.5 Flash", id: "gemini-3.5-flash" },
    { label: "Gemini 3.6 Flash（高精度）",     value: "Gemini 3.6 Flash", id: "gemini-3.6-flash" },
    { label: "Gemini 3.7 Flash（高速・安定）", value: "Gemini 3.7 Flash", id: "gemini-3.7-flash" },
    { label: "Gemini 3.8 Flash（最新）",       value: "Gemini 3.8 Flash", id: "gemini-3.8-flash" },
    { label: "Gemini 4 Argon（次世代）",       value: "Gemini 4 Argon",   id: "gemini-4-argon" }
];

// 端末に保存された追加モデルと初期リストを統合し、削除済みモデルを除外して返す
window.getAiModelList = function() {
    let customModels = [];
    let deletedIds = [];
    try {
        const savedCustom = localStorage.getItem('fishing_custom_ai_models');
        if (savedCustom) customModels = JSON.parse(savedCustom);
        const savedDeleted = localStorage.getItem('fishing_deleted_ai_models');
        if (savedDeleted) deletedIds = JSON.parse(savedDeleted);
    } catch (e) {}

    const deletedSet = new Set(deletedIds.map(id => String(id).toLowerCase()));

    const merged = [];
    DEFAULT_AI_MODELS.forEach(dm => {
        if (!deletedSet.has(dm.id.toLowerCase()) && !deletedSet.has(dm.value.toLowerCase())) {
            merged.push(dm);
        }
    });

    customModels.forEach(cm => {
        const cmId = String(cm.id || cm.value).toLowerCase();
        if (!deletedSet.has(cmId) && !merged.some(m => m.id.toLowerCase() === cmId)) {
            merged.push(cm);
        }
    });

    // 万が一すべて削除された場合は安全のため標準モデル1つを残す
    if (merged.length === 0) {
        return [DEFAULT_AI_MODELS[3] || DEFAULT_AI_MODELS[0]];
    }
    return merged;
};
window.AI_MODEL_LIST = window.getAiModelList();

// 選択文字列から正式なモデルIDを確定する
window.getActualModelName = function(modelValue) {
    if (!modelValue) return 'gemini-3.8-flash';
    const clean = String(modelValue).trim().toLowerCase();
    const list = window.getAiModelList();

    const found = list.find(m => 
        m.value.toLowerCase() === clean || 
        m.id.toLowerCase() === clean ||
        m.label.toLowerCase().includes(clean)
    );
    if (found) return found.id;

    if (clean.startsWith('gemini-')) return clean;
    if (clean.includes('3.5')) return 'gemini-3.5-flash';
    if (clean.includes('3.6')) return 'gemini-3.6-flash';
    if (clean.includes('3.7')) return 'gemini-3.7-flash';
    if (clean.includes('3.8')) return 'gemini-3.8-flash';
    if (clean.includes('argon') || clean.includes('4')) return 'gemini-4-argon';

    return 'gemini-3.8-flash';
};

// 新着AIモデルの自動チェック（無料枠のRPDを消費しないメタデータ取得）
window.checkNewGeminiModels = async function(apiKey, forceCheck = false) {
    const cleanKey = (apiKey || '').replace(/[\s\r\n ]/g, '');
    if (!cleanKey) return [];

    const today = getTodayString();
    const lastCheckDate = localStorage.getItem('fishing_last_model_check_date');
    const cachedNew = localStorage.getItem('fishing_detected_new_models');

    if (!forceCheck && lastCheckDate === today && cachedNew) {
        try {
            return JSON.parse(cachedNew);
        } catch (e) {}
    }

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
        if (!res.ok) return [];
        const data = await res.json();
        const remoteModels = data.models || [];

        const currentIds = window.getAiModelList().map(m => m.id.toLowerCase());
        let ignoredIds = [];
        let deletedIds = [];
        try {
            ignoredIds = JSON.parse(localStorage.getItem('fishing_ignored_ai_models') || '[]');
            deletedIds = JSON.parse(localStorage.getItem('fishing_deleted_ai_models') || '[]');
        } catch (e) {}

        const newModels = [];
        remoteModels.forEach(rm => {
            const rawName = (rm.name || '').replace('models/', '');
            const lowerId = rawName.toLowerCase();
            const methods = rm.supportedGenerationMethods || [];

            const isGenerative = methods.includes('generateContent');
            const isGemini = lowerId.startsWith('gemini-');
            const isNoise = lowerId.includes('embedding') || lowerId.includes('aqa') || lowerId.includes('tts') || lowerId.includes('1.0') || lowerId.includes('1.5') || lowerId.includes('2.0') || lowerId.includes('2.5');

            if (isGenerative && isGemini && !isNoise) {
                if (!currentIds.includes(lowerId) && !ignoredIds.includes(lowerId) && !deletedIds.includes(lowerId)) {
                    newModels.push({
                        id: rawName,
                        displayName: rm.displayName || rawName
                    });
                }
            }
        });

        localStorage.setItem('fishing_last_model_check_date', today);
        localStorage.setItem('fishing_detected_new_models', JSON.stringify(newModels));
        return newModels;
    } catch (e) {
        console.warn('Model check skipped:', e);
        return [];
    }
};

// 新モデルをリストに追加する
window.addCustomAiModel = function(modelObj) {
    if (!modelObj || !modelObj.id) return;
    const targetId = modelObj.id.toLowerCase();

    // 削除済みリストに入っていた場合は解除する
    try {
        const deleted = JSON.parse(localStorage.getItem('fishing_deleted_ai_models') || '[]');
        const nextDeleted = deleted.filter(id => String(id).toLowerCase() !== targetId);
        localStorage.setItem('fishing_deleted_ai_models', JSON.stringify(nextDeleted));
    } catch (e) {}

    let customModels = [];
    try {
        customModels = JSON.parse(localStorage.getItem('fishing_custom_ai_models') || '[]');
    } catch (e) {}

    if (!customModels.some(m => m.id.toLowerCase() === targetId)) {
        customModels.push({
            label: `${modelObj.displayName}（追加）`,
            value: modelObj.id,
            id: modelObj.id
        });
        localStorage.setItem('fishing_custom_ai_models', JSON.stringify(customModels));
    }

    window.AI_MODEL_LIST = window.getAiModelList();

    try {
        const detected = JSON.parse(localStorage.getItem('fishing_detected_new_models') || '[]');
        const nextDetected = detected.filter(d => d.id.toLowerCase() !== targetId);
        localStorage.setItem('fishing_detected_new_models', JSON.stringify(nextDetected));
    } catch (e) {}
};

// 指定したモデルをリストから削除する（追加モデル・初期モデル両対応）
window.removeAiModelFromList = function(modelValueOrId) {
    if (!modelValueOrId) return window.getAiModelList();
    const target = String(modelValueOrId).trim().toLowerCase();

    const currentList = window.getAiModelList();
    if (currentList.length <= 1) {
        throw new Error('最低1つのAIモデルを残す必要があります。');
    }

    const targetObj = currentList.find(m => m.value.toLowerCase() === target || m.id.toLowerCase() === target);
    const idToRemove = targetObj ? targetObj.id.toLowerCase() : target;
    const valToRemove = targetObj ? targetObj.value.toLowerCase() : target;

    // 1. カスタム追加リストから除去
    try {
        const customModels = JSON.parse(localStorage.getItem('fishing_custom_ai_models') || '[]');
        const nextCustom = customModels.filter(m => 
            m.id.toLowerCase() !== idToRemove && m.value.toLowerCase() !== valToRemove
        );
        localStorage.setItem('fishing_custom_ai_models', JSON.stringify(nextCustom));
    } catch (e) {}

    // 2. 削除済みリストに登録（初期モデルや再検知防止用）
    try {
        const deleted = JSON.parse(localStorage.getItem('fishing_deleted_ai_models') || '[]');
        if (!deleted.includes(idToRemove)) deleted.push(idToRemove);
        if (!deleted.includes(valToRemove)) deleted.push(valToRemove);
        localStorage.setItem('fishing_deleted_ai_models', JSON.stringify(deleted));
    } catch (e) {}

    window.AI_MODEL_LIST = window.getAiModelList();
    return window.AI_MODEL_LIST;
};

// モデルリストを初期状態（デフォルト5種＋通知リセット）に戻す
window.resetAiModelListToDefault = function() {
    localStorage.removeItem('fishing_custom_ai_models');
    localStorage.removeItem('fishing_deleted_ai_models');
    localStorage.removeItem('fishing_ignored_ai_models');
    localStorage.removeItem('fishing_detected_new_models');
    localStorage.removeItem('fishing_last_model_check_date');
    window.AI_MODEL_LIST = window.getAiModelList();
    return window.AI_MODEL_LIST;
};

// 新モデル通知を非表示にする
window.ignoreNewAiModel = function(modelId) {
    if (!modelId) return;
    try {
        const ignored = JSON.parse(localStorage.getItem('fishing_ignored_ai_models') || '[]');
        if (!ignored.includes(modelId.toLowerCase())) {
            ignored.push(modelId.toLowerCase());
            localStorage.setItem('fishing_ignored_ai_models', JSON.stringify(ignored));
        }
        const detected = JSON.parse(localStorage.getItem('fishing_detected_new_models') || '[]');
        const nextDetected = detected.filter(d => d.id.toLowerCase() !== modelId.toLowerCase());
        localStorage.setItem('fishing_detected_new_models', JSON.stringify(nextDetected));
    } catch (e) {}
};

// 単一モデル専用リクエスト送信
async function _sendSingleGeminiRequest({
    targetModelId,
    apiKey,
    prompt,
    base64Image = null,
    isJson = false,
    onStatusUpdate = null,
    timeoutMs = 45000
}) {
    const cleanKey = (apiKey || '').replace(/[\s\r\n ]/g, '');
    if (!cleanKey) {
        throw new Error('APIキーが設定されていません。設定画面の「システム」からGemini APIキーを入力してください。');
    }

    if (typeof onStatusUpdate === 'function') {
        onStatusUpdate(`【${targetModelId}】で解析を開始中...`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModelId}:generateContent?key=${cleanKey}`;
        
        const parts = [{ text: prompt }];
        if (base64Image) {
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image
                }
            });
        }

        const generationConfig = {
            temperature: 0.1,
            ...(isJson ? { responseMimeType: "application/json" } : {})
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }], generationConfig }),
            signal: controller.signal
        });

        clearTimeout(timer);

        if (!res.ok) {
            const errText = await res.text();
            let errMsg = `HTTP ${res.status}`;
            try {
                const errJson = JSON.parse(errText);
                if (errJson.error?.message) errMsg = errJson.error.message;
            } catch (e) {}
            throw new Error(`【${targetModelId} エラー】: ${errMsg}`);
        }

        const data = await res.json();
        const outText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!outText) throw new Error(`【${targetModelId}】から応答本文が得られませんでした`);
        
        return outText;

    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            throw new Error(`【${targetModelId}】の応答がタイムアウトしました。通信環境を確認してください。`);
        }
        throw err;
    }
}

// 1. テキスト生成（選択モデル単独）
window.callAiText = async function({ prompt, selectedModel = null, isJson = false, apiKey, onStatusUpdate = null }) {
    const active = selectedModel || localStorage.getItem('fishing_ai_model');
    const targetModelId = window.getActualModelName(active);

    return await _sendSingleGeminiRequest({
        targetModelId,
        apiKey,
        prompt,
        base64Image: null,
        isJson,
        onStatusUpdate,
        timeoutMs: 60000
    });
};

// 2. 画像解析（選択モデル単独）
window.callAiVision = async function({ prompt, base64Image, apiKey, selectedModel = null, onStatusUpdate = null }) {
    const active = selectedModel || localStorage.getItem('fishing_ai_model');
    const targetModelId = window.getActualModelName(active);

    const rawJsonText = await _sendSingleGeminiRequest({
        targetModelId,
        apiKey,
        prompt,
        base64Image,
        isJson: true,
        onStatusUpdate,
        timeoutMs: 45000
    });

    const clean = rawJsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const sIdx = clean.indexOf('{');
    const eIdx = clean.lastIndexOf('}');
    if (sIdx !== -1 && eIdx !== -1) {
        return JSON.parse(clean.substring(sIdx, eIdx + 1));
    }
    return JSON.parse(clean);
};

// --- 2. 共通ユーティリティ ---
const getUnit = (fishName) => {
    if (!fishName || typeof fishName !== 'string') return '匹';
    const name = fishName.toLowerCase();
    if (name.includes('イカ') || name.includes('タコ')) return '杯';
    if (name.includes('ブリ') || name.includes('ワラサ') || name.includes('カツオ') || name.includes('タチウオ')) return '本';
    if (name.includes('カワハギ') || name.includes('ヒラメ') || name.includes('カレイ')) return '枚';
    if (name.includes('アジ') || name.includes('アマダイ') || name.includes('カサゴ') || name.includes('タイ') || name.includes('シロギス')) return '尾';
    if (name.includes('kg')) return 'kg';
    return '匹';
};

const getTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getDayOfWeek = (dateString) => {
    if (!dateString) return '';
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : `(${days[date.getDay()]})`; };  const handleEnterKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); const inputs = Array.from(document.querySelectorAll(`input[type="${e.target.type}"]`));
        const index = inputs.indexOf(e.target);
        if (index > -1 && index < inputs.length - 1) inputs[index + 1].focus();
    }
};

const getTopAnglerDetails = (portSeats = [], starboardSeats = []) => {
    const p = (portSeats || []).filter(s => s && s.isVisible !== false).map(s => ({ ...s, sideLabel: '左舷' }));
    const s = (starboardSeats || []).filter(s => s && s.isVisible !== false).map(s => ({ ...s, sideLabel: '右舷' }));
    const all = [...p, ...s];
    const counts = all.map(seat => parseInt(seat.count) || 0);
    const max = counts.length > 0 ? Math.max(...counts) : 0;
    const min = counts.length > 0 ? Math.min(...counts) : 0;
    const total = counts.reduce((acc, c) => acc + c, 0);
    const avg = all.length > 0 ? Math.round(total / all.length * 10) / 10 : 0;

    if (max <= 0 || all.length === 0) {
        return { max: 0, min: 0, avg: 0, anglers: all.length, topNames: [], topNamesString: '' };
    }

    const topSeats = all.filter(seat => (parseInt(seat.count) || 0) === max);
    const topNames = topSeats.map(seat => seat.name && seat.name.trim() !== '' ? seat.name.trim() : `${seat.sideLabel}${seat.id}番`);
    return {
        max, min, avg, anglers: all.length,
        topNames,
        topNamesString: topNames.join('・')
    };
};

// --- 3. 共通アイコン定義 ---
const IconCalendar = ({ className = "w-4 h-4" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>);
const IconTrophy = ({ className = "w-4 h-4 mr-1 shrink-0" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
        <defs>
            <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="25%" stopColor="#FCD34D" />
                <stop offset="60%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
        </defs>
        <path fill="url(#goldGrad2)" d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.76 2.7 3.21 3.35L9.5 19H8v2h8v-2h-1.5l-1.1-2.71c1.45-.65 2.58-1.85 3.21-3.35 2.47-.31 4.39-2.39 4.39-4.94V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
        <polygon points="12,6.5 13,8.8 15.5,8.8 13.5,10.2 14.2,12.5 12,11.1 9.8,12.5 10.5,10.2 8.5,8.8 11,8.8" fill="#FFFBEB" />
    </svg>
);
const IconChevronDown = ({ className = "w-5 h-5" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>);
const IconChevronUp = ({ className = "w-5 h-5" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>);
const IconChevronRight = ({ className = "w-5 h-5" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>);
const IconChevronLeft = ({ className = "w-5 h-5" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>);
const IconRefresh = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>);
const IconKeyboard = ({ className = "w-3.5 h-3.5 mr-1" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" /></svg>);
const IconAnchor = ({ className = "w-5 h-5 mb-0.5" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7.5v12.5M5 12h14M6 16a6 6 0 0012 0" /></svg>);
const IconSettings = ({ className = "w-6 h-6" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const IconMoon = ({ className = "w-5 h-5" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>);
const IconSun = ({ className = "w-5 h-5" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>);
const IconRuler = ({ className = "w-4 h-4 mr-1 text-sky-500" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 2L2 6l16 16 4-4L6 2zM6 6l2 2M10 10l2 2M14 14l2 2" /></svg>);
const IconShare = () => (<svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>);
const IconSwipe = ({ className = "w-4 h-4 mr-1" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>);
const IconLine = () => (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.966 8.914 9.426 9.613.369.078.871.241 1.002.551.118.283.076.726.037.994l-.129.771c-.038.232-.18.895.787.487s5.234-3.084 7.159-5.289c1.077-1.22 1.718-2.585 1.718-4.041.001-.001.001-1.033.001-1.086z"/></svg>);
const IconMail = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" /></svg>);
const IconStar = ({ className = "w-4 h-4 mr-1 text-amber-500" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>);
const IconTrash = ({ className = "w-5 h-5" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>);
const IconChart = ({ className = "w-4 h-4 mr-1 text-emerald-500" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);
const IconDownload = ({ className = "w-4 h-4 mr-1 text-sky-500" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>);
const IconUpload = ({ className = "w-4 h-4 mr-1 text-emerald-500" }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>);

window.getUnit = getUnit;
window.getTodayString = getTodayString;
window.getDayOfWeek = getDayOfWeek;
window.handleEnterKey = handleEnterKey;
window.getTopAnglerDetails = getTopAnglerDetails;

window.IconCalendar = IconCalendar;
window.IconTrophy = IconTrophy;
window.IconChevronDown = IconChevronDown;
window.IconChevronUp = IconChevronUp;
window.IconChevronRight = IconChevronRight;
window.IconChevronLeft = IconChevronLeft;
window.IconRefresh = IconRefresh;
window.IconKeyboard = IconKeyboard;
window.IconAnchor = IconAnchor;
window.IconSettings = IconSettings;
window.IconMoon = IconMoon;
window.IconSun = IconSun;
window.IconRuler = IconRuler;
window.IconShare = IconShare;
window.IconSwipe = IconSwipe;
window.IconLine = IconLine;
window.IconMail = IconMail;
window.IconStar = IconStar;
window.IconTrash = IconTrash;
window.IconChart = IconChart;
window.IconDownload = IconDownload;
window.IconUpload = IconUpload;