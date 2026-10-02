// ==========================================
// api.js : Gemini API 通信・ユーティリティ・アイコン定義
// ==========================================

const MODEL_NAME_MAP = {
    'Gemini 3.8 Flash': 'gemini-3.8-flash',
    'Gemini 3.7 Flash': 'gemini-3.7-flash',
    'Gemini 3.6 Flash': 'gemini-3.6-flash',
    'Gemini 3.5 Flash': 'gemini-3.5-flash',
    'Gemini 3.1 Pro': 'gemini-3.1-pro'
};

const getActualModelName = (name) => MODEL_NAME_MAP[name] || 'gemini-3.8-flash';

const fetchWithBackoff = async (url, options, retries = 5) => {
    const delays = [1000, 2000, 4000, 8000, 16000];
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                const errBody = await res.text();
                let errMsg = `エラー ${res.status}`;
                try {
                    const errJson = JSON.parse(errBody);
                    if (errJson.error?.message) errMsg += `: ${errJson.error.message}`;
                } catch (e) {}
                throw new Error(errMsg);
            }
            return await res.json();
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, delays[i]));
        }
    }
};

const callGeminiApi = async (apiKey, prompt, model = 'gemini-3.8-flash', isJson = false, base64Image = null, mimeType = 'image/jpeg', signal = null) => {
    const cleanKey = (apiKey || '').replace(/[\s\r\n ]/g, '');
    if (!cleanKey) throw new Error('APIキーが設定されていません。設定画面の「データ管理」からGemini APIキーを入力してください。');
    
    const actualModel = MODEL_NAME_MAP[model] || model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${cleanKey}`;
    
    const parts = [{ text: prompt }];
    if (base64Image) {
        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: base64Image
            }
        });
    }

    const payload = {
        contents: [{ parts }],
        ...(isJson ? { generationConfig: { responseMimeType: "application/json" } } : {})
    };

    const result = await fetchWithBackoff(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: signal
    });

    return result.candidates?.[0]?.content?.parts?.[0]?.text;
};

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
    return isNaN(date.getTime()) ? '' : `(${days[date.getDay()]})`;
};

const handleEnterKey = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const inputs = Array.from(document.querySelectorAll(`input[type="${e.target.type}"]`));
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

// アイコンコンポーネント群
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
        <path
            fill="url(#goldGrad2)"
            d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.76 2.7 3.21 3.35L9.5 19H8v2h8v-2h-1.5l-1.1-2.71c1.45-.65 2.58-1.85 3.21-3.35 2.47-.31 4.39-2.39 4.39-4.94V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"
        />
        <polygon
            points="12,6.5 13,8.8 15.5,8.8 13.5,10.2 14.2,12.5 12,11.1 9.8,12.5 10.5,10.2 8.5,8.8 11,8.8"
            fill="#FFFBEB"
        />
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

// 他のファイルから直接参照できるよう window に登録
window.MODEL_NAME_MAP = MODEL_NAME_MAP;
window.getActualModelName = getActualModelName;
window.fetchWithBackoff = fetchWithBackoff;
window.callGeminiApi = callGeminiApi;
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