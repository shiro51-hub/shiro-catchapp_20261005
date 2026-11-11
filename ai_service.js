// ==========================================
// ai_service.js : AIモデル一元管理 ＆ 共通通信サービス
// ==========================================

const AI_MODEL_CONFIG = {
    textModels: [
        { label: "Gemini 3.5 Flash（標準・推奨）", value: "Gemini 3.5 Flash", id: "gemini-3.5-flash" },
        { label: "Gemini 3.6 Flash（高精度）",     value: "Gemini 3.6 Flash", id: "gemini-3.6-flash" },
        { label: "Gemini 3.7 Flash（高速・安定）", value: "Gemini 3.7 Flash", id: "gemini-3.7-flash" },
        { label: "Gemini 3.8 Flash（最新）",       value: "Gemini 3.8 Flash", id: "gemini-3.8-flash" },
        { label: "Gemini 4 Argon（次世代）",       value: "Gemini 4 Argon",   id: "gemini-4-argon" }
    ],
    visionModels: [
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'gemini-3.8-flash'
    ],
    maxAttemptsPerModel: 2
};

window.getAiModelList = function() {
    return AI_MODEL_CONFIG.textModels;
};
window.AI_MODEL_LIST = AI_MODEL_CONFIG.textModels;

// モデル名・IDのゆらぎを完全に吸収
window.getActualModelName = function(modelValue) {
    if (!modelValue) return 'gemini-3.5-flash';
    const clean = String(modelValue).trim().toLowerCase();

    const found = AI_MODEL_CONFIG.textModels.find(m => 
        m.value.toLowerCase() === clean || 
        m.id.toLowerCase() === clean ||
        m.label.toLowerCase().includes(clean)
    );
    if (found) return found.id;

    if (clean.includes('3.5')) return 'gemini-3.5-flash';
    if (clean.includes('3.6')) return 'gemini-3.6-flash';
    if (clean.includes('3.7')) return 'gemini-3.7-flash';
    if (clean.includes('3.8')) return 'gemini-3.8-flash';
    if (clean.includes('argon') || clean.includes('4')) return 'gemini-4-argon';

    return 'gemini-3.5-flash';
};

// 選択モデルを必ず最優先（mIdx = 0）に配置
window.getModelRotationOrder = function(currentSelectedValue, baseList = null) {
    const targetId = window.getActualModelName(currentSelectedValue);
    const defaultList = baseList ? [...baseList] : AI_MODEL_CONFIG.textModels.map(m => m.id);
    const filtered = defaultList.filter(id => id !== targetId);
    return [targetId, ...filtered];
};

// ==========================================
// 共通実行エンジン（HTTP 400エラーの原因を完全除去）
// ==========================================
async function _executeGeminiRequest({
    models,
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

    let lastError = null;

    for (let mIdx = 0; mIdx < models.length; mIdx++) {
        const currentModel = models[mIdx];
        const isFirst = (mIdx === 0);

        if (typeof onStatusUpdate === 'function') {
            if (isFirst) {
                onStatusUpdate(`【${currentModel}】で解析を開始中...`);
            } else {
                onStatusUpdate(`混雑のため【${currentModel}】へ切り替えて再試行中...`);
                await new Promise(r => setTimeout(r, 1200));
            }
        }

        for (let attempt = 1; attempt <= AI_MODEL_CONFIG.maxAttemptsPerModel; attempt++) {
            const attemptController = new AbortController();
            const attemptTimer = setTimeout(() => attemptController.abort(), timeoutMs);

            try {
                if (attempt > 1 && typeof onStatusUpdate === 'function') {
                    onStatusUpdate(`応答待ちのため【${currentModel}】で再試行中... (${attempt}/${AI_MODEL_CONFIG.maxAttemptsPerModel})`);
                    await new Promise(r => setTimeout(r, attempt * 1200));
                }

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${cleanKey}`;
                
                const parts = [{ text: prompt }];
                if (base64Image) {
                    parts.push({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Image
                        }
                    });
                }

                // ★HTTP 400の原因となっていた thinkingBudget は完全排除。
                // 標準的で最も互換性の高い generationConfig のみを送信
                const generationConfig = {
                    temperature: 0.1,
                    ...(isJson ? { responseMimeType: "application/json" } : {})
                };

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts }], generationConfig }),
                    signal: attemptController.signal
                });

                clearTimeout(attemptTimer);

                if (!res.ok) {
                    const errText = await res.text();
                    let errMsg = `HTTP ${res.status}`;
                    try {
                        const errJson = JSON.parse(errText);
                        if (errJson.error?.message) errMsg = errJson.error.message;
                    } catch (e) {}

                    // クォータ上限エラー時のみ次モデルへ即時フォールバック
                    if (errMsg.toLowerCase().includes('limit: 0') || errMsg.toLowerCase().includes('quota exceeded')) {
                        lastError = new Error(errMsg);
                        break;
                    }
                    throw new Error(errMsg);
                }

                const data = await res.json();
                const outText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!outText) throw new Error('AIから応答本文が得られませんでした');
                
                return outText;

            } catch (err) {
                clearTimeout(attemptTimer);
                lastError = err;

                const isTimeout = (err.name === 'AbortError');
                const lowerMsg = (err.message || '').toLowerCase();
                const isRetryable = isTimeout || lowerMsg.includes('503') || lowerMsg.includes('500') || lowerMsg.includes('overloaded') || lowerMsg.includes('429');

                if (isTimeout && typeof onStatusUpdate === 'function') {
                    onStatusUpdate(`応答に時間がかかっているため再試行します...`);
                }

                if (!isRetryable) break;
            }
        }
    }

    throw lastError || new Error('設定されているすべてのAIモデルで応答が得られませんでした');
}

// 1. テキスト生成（日報・多角分析用）
window.callAiText = async function({ prompt, selectedModel = null, isJson = false, apiKey, onStatusUpdate = null }) {
    const rawSelected = selectedModel || localStorage.getItem('fishing_ai_model') || 'Gemini 3.5 Flash';
    const modelQueue = window.getModelRotationOrder(rawSelected, AI_MODEL_CONFIG.textModels.map(m => m.id));

    return await _executeGeminiRequest({
        models: modelQueue,
        apiKey,
        prompt,
        base64Image: null,
        isJson,
        onStatusUpdate,
        timeoutMs: 60000
    });
};

// 2. 画像解析（気象予報・潮時表解析用）
window.callAiVision = async function({ prompt, base64Image, apiKey, selectedModel = null, onStatusUpdate = null }) {
    const rawSelected = selectedModel || localStorage.getItem('fishing_ai_model') || 'Gemini 3.5 Flash';
    const modelQueue = window.getModelRotationOrder(rawSelected, AI_MODEL_CONFIG.visionModels);

    try {
        const rawJsonText = await _executeGeminiRequest({
            models: modelQueue,
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
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('画像の解析がタイムアウトしました。混雑しているため少し時間を置いて再試行してください。');
        }
        throw err;
    }
};