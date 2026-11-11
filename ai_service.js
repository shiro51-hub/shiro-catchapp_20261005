// ==========================================
// ai_service.js : 選択モデル単独実行エンジン（自動リレー完全停止版）
// ==========================================

const AI_MODEL_CONFIG = {
    textModels: [
        { label: "Gemini 3.5 Flash（標準）",       value: "Gemini 3.5 Flash", id: "gemini-3.5-flash" },
        { label: "Gemini 3.6 Flash（高精度）",     value: "Gemini 3.6 Flash", id: "gemini-3.6-flash" },
        { label: "Gemini 3.7 Flash（高速・安定）", value: "Gemini 3.7 Flash", id: "gemini-3.7-flash" },
        { label: "Gemini 3.8 Flash（最新）",       value: "Gemini 3.8 Flash", id: "gemini-3.8-flash" },
        { label: "Gemini 4 Argon（次世代）",       value: "Gemini 4 Argon",   id: "gemini-4-argon" }
    ]
};

window.getAiModelList = function() {
    return AI_MODEL_CONFIG.textModels;
};
window.AI_MODEL_LIST = AI_MODEL_CONFIG.textModels;

// 選択された文字列から正式なモデルIDを確定する
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

// 単一モデル専用リクエスト送信（フォールバック一切なし）
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
            // 勝手に別モデルへ逃げず、選んだモデルのエラーをそのまま通知する
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