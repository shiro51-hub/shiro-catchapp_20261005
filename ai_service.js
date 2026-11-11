// ==========================================
// ai_service.js : AIモデル一元管理 ＆ 共通通信サービス
// ==========================================

const AI_MODEL_CONFIG = {
    // 画面の選択肢およびテキスト生成（日報・多角分析）の優先ローテーション順
    textModels: [
        { label: "Gemini 3.8 Flash（推奨・最新）", value: "Gemini 3.8 Flash", id: "gemini-3.8-flash" },
        { label: "Gemini 3.7 Flash（高速・安定）", value: "Gemini 3.7 Flash", id: "gemini-3.7-flash" },
        { label: "Gemini 3.6 Flash（高精度）",     value: "Gemini 3.6 Flash", id: "gemini-3.6-flash" },
        { label: "Gemini 3.5 Flash（標準）",       value: "Gemini 3.5 Flash", id: "gemini-3.5-flash" },
        { label: "Gemini 4 Argon（次世代モデル）",  value: "Gemini 4 Argon",   id: "gemini-4-argon" }
    ],
    // 画像解析用（気象予報・潮時表）の標準ローテーション
    visionModels: [
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash'
    ],
    maxAttemptsPerModel: 2
};

// 外部から確実に取得できるように関数として公開
window.getAiModelList = function() {
    return AI_MODEL_CONFIG.textModels;
};
window.AI_MODEL_LIST = AI_MODEL_CONFIG.textModels;

// モデル表示名から内部IDを取得
window.getActualModelName = function(modelValue) {
    const list = AI_MODEL_CONFIG.textModels;
    const found = list.find(m => m.value === modelValue || m.id === modelValue);
    return found ? found.id : list[0].id;
};

// 選択されたモデルを先頭にしたローテーション配列を取得
window.getModelRotationOrder = function(currentSelectedValue, baseList = null) {
    const sourceList = baseList || AI_MODEL_CONFIG.textModels.map(m => m.id);
    const currentId = window.getActualModelName(currentSelectedValue);
    const filtered = sourceList.filter(id => id !== currentId);
    return [currentId, ...filtered];
};

// ==========================================
// 共通実行エンジン（思考抑制対応・リトライ完全連動版）
// ==========================================
async function _executeGeminiRequest({
    models,
    apiKey,
    prompt,
    base64Image = null,
    isJson = false,
    onStatusUpdate = null,
    timeoutMs = 60000
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
            await new Promise(r => setTimeout(r, 1200));
        }

        for (let attempt = 1; attempt <= AI_MODEL_CONFIG.maxAttemptsPerModel; attempt++) {
            const attemptController = new AbortController();
            const attemptTimer = setTimeout(() => attemptController.abort(), timeoutMs);

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

                // 思考モード（Thinking）を抑制してOCR・画像解析を高速化
                const generationConfig = {
                    temperature: 0.1,
                    ...(isJson ? { responseMimeType: "application/json" } : {}),
                    thinkingConfig: { thinkingBudget: 0 }
                };

                const payload = {
                    contents: [{ parts }],
                    generationConfig
                };

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
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
        onStatusUpdate,
        timeoutMs: 60000
    });
};

// 2. 画像解析（選択モデル引き継ぎ ＆ 高速化版）
window.callAiVision = async function({ prompt, base64Image, apiKey, selectedModel = null, onStatusUpdate = null }) {
    const modelQueue = selectedModel 
        ? window.getModelRotationOrder(selectedModel, AI_MODEL_CONFIG.visionModels) 
        : AI_MODEL_CONFIG.visionModels;

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