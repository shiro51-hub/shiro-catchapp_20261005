// ==========================================
// ai_service.js : AIモデル一元管理 ＆ 共通通信サービス
// ==========================================

// 【モデルマスター定義】
// 今後モデルの追加・変更・削除を行う際はこの配列のみを編集します
window.AI_MODEL_LIST = [
    { label: "Gemini 3.8 Flash（推奨・最速）", value: "Gemini 3.8 Flash", id: "gemini-3.8-flash" },
    { label: "Gemini 3.6 Flash（高速）", value: "Gemini 3.6 Flash", id: "gemini-3.6-flash" },
    { label: "Gemini 3.5 Flash（安定）", value: "Gemini 3.5 Flash", id: "gemini-3.5-flash" }
];

window.AI_VISION_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash'
];

const AI_MODEL_CONFIG = {
    textModels: window.AI_MODEL_LIST,
    visionModels: window.AI_VISION_MODELS,
    maxAttemptsPerModel: 2
};

// モデル表示名から内部IDを取得
window.getActualModelName = function(modelValue) {
    const list = window.AI_MODEL_LIST || [];
    const found = list.find(m => m.value === modelValue || m.id === modelValue);
    return found ? found.id : (list[0] ? list[0].id : 'gemini-3.8-flash');
};

// 選択されたモデルを先頭にしたローテーション配列を取得
window.getModelRotationOrder = function(currentSelectedValue) {
    const list = window.AI_MODEL_LIST || [];
    const allIds = list.map(m => m.id);
    const currentId = window.getActualModelName(currentSelectedValue);
    const startIndex = allIds.indexOf(currentId);
    if (startIndex !== -1) {
        return allIds.slice(startIndex);
    }
    return allIds;
};
// ==========================================
// 共通実行エンジン（内部用）
// ==========================================
async function _executeGeminiRequest({
    models,
    apiKey,
    prompt,
    base64Image = null,
    isJson = false,
    onStatusUpdate = null,
    signal = null
}) {
    const cleanKey = (apiKey || '').replace(/[\s\r\n ]/g, '');
    if (!cleanKey) {
        throw new Error('APIキーが設定されていません。設定画面の「システム」からGemini APIキーを入力してください。');
    }

    let lastError = null;

    for (let mIdx = 0; mIdx < models.length; mIdx++) {
        const currentModel = models[mIdx];
        const isFirst = (mIdx === 0);

        if (!isFirst && typeof onStatusUpdate === 'function') {
            onStatusUpdate(`混雑のため【${currentModel}】へ切り替えて再試行中...`);
            await new Promise(r => setTimeout(r, 1500));
        }

        for (let attempt = 1; attempt <= AI_MODEL_CONFIG.maxAttemptsPerModel; attempt++) {
            try {
                if (attempt > 1 && typeof onStatusUpdate === 'function') {
                    onStatusUpdate(`サーバー混雑のため【${currentModel}】で再試行中... (${attempt}/${AI_MODEL_CONFIG.maxAttemptsPerModel})`);
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

                const payload = {
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: 0.1,
                        ...(isJson ? { responseMimeType: "application/json" } : {})
                    }
                };

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: signal
                });

                if (!res.ok) {
                    const errText = await res.text();
                    let errMsg = `HTTP ${res.status}`;
                    try {
                        const errJson = JSON.parse(errText);
                        if (errJson.error?.message) errMsg = errJson.error.message;
                    } catch (e) {}

                    // 無料枠制限（limit: 0等）の場合は即座に次のモデルへ
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
                lastError = err;
                if (err.name === 'AbortError') throw err;

                const lowerMsg = (err.message || '').toLowerCase();
                const isRetryable = lowerMsg.includes('503') || lowerMsg.includes('500') || lowerMsg.includes('overloaded') || lowerMsg.includes('429');
                if (!isRetryable) break;
            }
        }
    }

    throw lastError || new Error('設定されているすべてのAIモデルで応答が得られませんでした');
}

// ==========================================
// 外部公開関数
// ==========================================

// 1. テキスト生成（日報作成・釣況カルテ分析用）
window.callAiText = async function({ prompt, selectedModel = null, isJson = false, apiKey, onStatusUpdate = null }) {
    const modelQueue = selectedModel 
        ? window.getModelRotationOrder(selectedModel) 
        : AI_MODEL_CONFIG.textModels.map(m => m.id);

    return await _executeGeminiRequest({
        models: modelQueue,
        apiKey,
        prompt,
        base64Image: null,
        isJson,
        onStatusUpdate
    });
};

// 2. 画像解析（気象予報・潮時表解析用）
window.callAiVision = async function({ prompt, base64Image, apiKey, onStatusUpdate = null, timeoutMs = 20000 }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const rawJsonText = await _executeGeminiRequest({
            models: AI_MODEL_CONFIG.visionModels,
            apiKey,
            prompt,
            base64Image,
            isJson: true,
            onStatusUpdate,
            signal: controller.signal
        });

        clearTimeout(timer);
        const clean = rawJsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const sIdx = clean.indexOf('{');
        const eIdx = clean.lastIndexOf('}');
        if (sIdx !== -1 && eIdx !== -1) {
            return JSON.parse(clean.substring(sIdx, eIdx + 1));
        }
        return JSON.parse(clean);
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            throw new Error('画像の解析がタイムアウトしました。通信環境の良い場所で再試行してください。');
        }
        throw err;
    }
};