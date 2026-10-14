// ==========================================
// report.js : 詳細メモ・AI日報ウィザード・多角分析モーダル群
// ==========================================

// 詳細メモモーダル
const MemoModal = ({
    showMemoModal,
    setShowMemoModal,
    tempMemo,
    setTempMemo,
    copyMemoToClipboard,
    saveMemo
}) => {
    if (!showMemoModal) return null;

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMemoModal(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col h-[85vh] animate-slideUpModal overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50 dark:bg-slate-800 rounded-t-3xl shrink-0">
                    <h2 className="text-base font-black text-indigo-800 dark:text-indigo-400 flex items-center">
                        📝 詳細メモ・釣行メモ
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={copyMemoToClipboard} className="bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-xs font-bold border shadow-sm active:bg-indigo-50">コピー</button>
                        <button onClick={() => setShowMemoModal(false)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full font-bold shadow-sm text-gray-500">✕</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900/50 space-y-3 flex flex-col">
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-bold shrink-0">
                        当日の詳細な状況、仕掛け、ヒットパターン、お客様の様子などを自由に記録できます。
                    </p>
                    <textarea
                        className="w-full flex-1 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-medium text-gray-800 dark:text-slate-100 resize-none shadow-inner"
                        placeholder="ここに自由にメモを入力してください..."
                        value={tempMemo}
                        onChange={(e) => setTempMemo(e.target.value)}
                        autoFocus
                    ></textarea>
                </div>
                <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe shrink-0 flex gap-2">
                    <button onClick={saveMemo} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-md active:bg-indigo-800 transition-colors flex justify-center items-center text-sm">
                        メモを保存して閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};

// =======================================================
// AI日報用インタビューウィザードモーダル（カスタム単語チップ対応版）
// =======================================================

const AiInputWizardModal = ({
    showAiInputModal,
    setShowAiInputModal,
    aiCurrentStep,
    setAiCurrentStep,
    wizardSteps,
    aiInputData,
    setAiInputData,
    targetRecordForAi,
    updateAiInputForRecord,
    userApiKey,
    setUserApiKey,
    handleAiGenerate
}) => {
    // 船長カスタムチップの保存・読み込みステート（初期値リストなし・シンプル版）
    const [customTagsMap, setCustomTagsMap] = React.useState(() => {
        try {
            const saved = localStorage.getItem('fishing_custom_wizard_tags');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {}
        return {};
    });
    const [isEditingTags, setIsEditingTags] = React.useState(false);
    const [newTagInput, setNewTagInput] = React.useState('');
    const [draggingIdx, setDraggingIdx] = React.useState(null);
    const draggingIdxRef = React.useRef(null);

    // ステップが切り替わったら編集モードとドラッグ状態をリセット
    React.useEffect(() => {
        setIsEditingTags(false);
        setNewTagInput('');
        setDraggingIdx(null);
        draggingIdxRef.current = null;
    }, [aiCurrentStep, showAiInputModal]);

    const currentStep = (wizardSteps && wizardSteps[aiCurrentStep]) || {};
    const currentTags = (currentStep.id && customTagsMap[currentStep.id]) || [];

    // カスタムチップの保存処理
    const saveCustomTags = (updatedMap) => {
        setCustomTagsMap(updatedMap);
        try {
            localStorage.setItem('fishing_custom_wizard_tags', JSON.stringify(updatedMap));
        } catch (e) {}
    };

    // タグをタップして入力欄へ追加する関数
    const handleAddTag = (tagText) => {
        const fieldKey = currentStep.id;
        if (!fieldKey) return;
        const currentVal = aiInputData[fieldKey] || '';
        let newVal = '';
        if (!currentVal.trim()) {
            newVal = tagText;
        } else if (currentVal.endsWith('、') || currentVal.endsWith('。') || currentVal.endsWith(' ')) {
            newVal = `${currentVal}${tagText}`;
        } else {
            newVal = `${currentVal}、${tagText}`;
        }

        setAiInputData(prev => ({ ...prev, [fieldKey]: newVal }));
        if (targetRecordForAi) {
            updateAiInputForRecord(targetRecordForAi.id, fieldKey, newVal);
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
        }
    };

    // 新しい単語チップを登録する関数
    const handleCreateTag = () => {
        const trimmed = newTagInput.trim();
        const fieldKey = currentStep.id;
        if (!trimmed || !fieldKey) return;
        const existing = customTagsMap[fieldKey] || [];
        if (existing.includes(trimmed)) {
            setNewTagInput('');
            return;
        }
        const updated = {
            ...customTagsMap,
            [fieldKey]: [...existing, trimmed]
        };
        saveCustomTags(updated);
        setNewTagInput('');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }
    };

    // 不要な単語チップを削除する関数
    const handleDeleteTag = (tagToDelete) => {
        const fieldKey = currentStep.id;
        if (!fieldKey) return;
        const existing = customTagsMap[fieldKey] || [];
        const updated = {
            ...customTagsMap,
            [fieldKey]: existing.filter(t => t !== tagToDelete)
        };
        saveCustomTags(updated);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
        }
    };

    // チップの順番を入れ替える共通関数
    const moveTagOrder = (fromIdx, toIdx) => {
        const fieldKey = currentStep.id;
        if (!fieldKey || fromIdx === null || toIdx === null || fromIdx === toIdx) return;
        const list = [...(customTagsMap[fieldKey] || [])];
        if (fromIdx < 0 || fromIdx >= list.length || toIdx < 0 || toIdx >= list.length) return;

        const [movedItem] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, movedItem);

        const updated = {
            ...customTagsMap,
            [fieldKey]: list
        };
        saveCustomTags(updated);
        draggingIdxRef.current = toIdx;
        setDraggingIdx(toIdx);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(12);
        }
    };

    // 指・マウス共通のポインタードラッグ開始（親コンテナで一括追跡）
    const handlePointerDownChip = (e, idx) => {
        if (!isEditingTags) return;
        // 削除ボタンや前後ボタンの上を押した時はドラッグを開始しない
        if (e.target.closest('button')) return;
        e.preventDefault();
        draggingIdxRef.current = idx;
        setDraggingIdx(idx);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }
    };

    // 指・マウスを動かしている最中のリアルタイム入れ替え判定
    React.useEffect(() => {
        if (!showAiInputModal || !isEditingTags || draggingIdx === null) return;

        const handleGlobalPointerMove = (e) => {
            if (draggingIdxRef.current === null) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const targetEl = document.elementFromPoint(clientX, clientY);
            if (!targetEl) return;

            const chipEl = targetEl.closest('[data-tag-index]');
            if (chipEl) {
                const overIdx = parseInt(chipEl.getAttribute('data-tag-index'), 10);
                if (!isNaN(overIdx) && overIdx !== draggingIdxRef.current) {
                    moveTagOrder(draggingIdxRef.current, overIdx);
                }
            }
        };

        const handleGlobalPointerUp = () => {
            draggingIdxRef.current = null;
            setDraggingIdx(null);
        };

        window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);
        window.addEventListener('touchmove', handleGlobalPointerMove, { passive: false });
        window.addEventListener('touchend', handleGlobalPointerUp);

        return () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerUp);
            window.removeEventListener('touchmove', handleGlobalPointerMove);
            window.removeEventListener('touchend', handleGlobalPointerUp);
        };
    }, [showAiInputModal, isEditingTags, draggingIdx, customTagsMap, aiCurrentStep]);

    // すべてのReactフック（useState / useEffect）の後に配置することで画面消失エラーを防止
    if (!showAiInputModal) return null;

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiInputModal(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col h-[90vh] animate-slideUpModal overflow-hidden">
                
                {/* ヘッダー */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-amber-50 dark:bg-slate-800 rounded-t-3xl shrink-0">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-black text-amber-800 dark:text-amber-400 flex items-center">
                            <IconStar className="w-5 h-5 mr-1 text-amber-500" /> 日報用インタビュー
                        </h2>
                        <span className="text-xs font-bold text-amber-600/70 dark:text-amber-400/70 mt-0.5">ステップ {aiCurrentStep + 1} / {wizardSteps.length}</span>
                    </div>
                    <button onClick={() => setShowAiInputModal(false)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full shadow-sm text-gray-500 font-bold active:bg-gray-100 transition-colors">✕</button>
                </div>

                {/* メインエリア */}
                <div className="flex-1 overflow-y-auto p-4 no-scrollbar flex flex-col">
                    <div className="flex-1 flex flex-col space-y-3 animate-[fadeIn_0.2s_ease-out]">
                        <div className="mb-1 shrink-0">
                            <h3 className="text-base sm:text-lg font-black text-gray-800 dark:text-slate-100 mb-1">{currentStep.title}</h3>
                            <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{currentStep.desc}</p>
                        </div>

                        {/* 1. パターン選択（Step 8: 複数選択・文字拡大版） */}
                        {currentStep.isMultiSelect ? (
                            <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar pr-0.5">
                                {currentStep.options.map((opt) => {
                                    const isSelected = (aiInputData.patterns || []).includes(opt.id);
                                    return (
                                        <button key={opt.id} onClick={() => {
                                            let next = [...(aiInputData.patterns || [])];
                                            if (isSelected) {
                                                next = next.filter(id => id !== opt.id);
                                                if (next.length === 0) next = [opt.id];
                                            } else {
                                                next.push(opt.id);
                                                next.sort((a,b) => a - b);
                                            }
                                            setAiInputData(prev => ({ ...prev, patterns: next }));
                                            if(targetRecordForAi) updateAiInputForRecord(targetRecordForAi.id, 'patterns', next);
                                        }} className={`p-3.5 rounded-xl border-2 text-left font-black transition-all ${isSelected ? 'bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-100' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'} flex items-center justify-between`}>
                                            <span className="text-sm sm:text-base leading-snug pr-2">{opt.label}</span>
                                            <span className="text-xl shrink-0">{isSelected ? '☑' : '☐'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : currentStep.isSelect ? (
                            /* 2. 釣況選択（単一選択） */
                            <div className="flex flex-col gap-2 my-auto">
                                {currentStep.options.map((opt, i) => (
                                    <button key={i} onClick={() => {
                                        setAiInputData(prev => ({ ...prev, [currentStep.id]: opt }));
                                        if (targetRecordForAi) updateAiInputForRecord(targetRecordForAi.id, currentStep.id, opt);
                                        setTimeout(() => setAiCurrentStep(prev => prev + 1), 200);
                                    }} className={`p-4 rounded-xl border-2 text-left font-black text-base sm:text-lg transition-all ${aiInputData[currentStep.id] === opt ? 'bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-100' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'}`}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                       ) : (
                            /* 3. 自由記述 ＋ カスタム単語チップ（全チップ表示・ドラッグ＆矢印移動対応版） */
                            <div className="flex-1 flex flex-col min-h-0 gap-2.5">
                                {/* テキスト入力欄：編集モード時は自動でコンパクトに畳んでチップ一覧を広く見せる */}
                                <div className={`transition-all duration-200 ${isEditingTags ? 'h-14 shrink-0' : 'flex-1 min-h-[110px]'}`}>
                                    <textarea
                                        placeholder={currentStep.placeholder}
                                        className="w-full h-full border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-3 bg-gray-50 dark:bg-slate-800 text-base sm:text-lg font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-inner leading-relaxed"
                                        value={aiInputData[currentStep.id] || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setAiInputData(prev => ({ ...prev, [currentStep.id]: val }));
                                            if(targetRecordForAi) updateAiInputForRecord(targetRecordForAi.id, currentStep.id, val);
                                        }}
                                        autoFocus={!isEditingTags}
                                    ></textarea>
                                </div>

                                {/* 単語チップ管理エリア：編集モード時は画面の残りスペースいっぱいに広げる */}
                                <div className={`flex flex-col min-h-0 pt-1 ${isEditingTags ? 'flex-1' : 'shrink-0'}`}>
                                    <div className="flex justify-between items-center mb-2 shrink-0">
                                        <div className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                            <span>🏷️</span>
                                            <span>{isEditingTags ? 'ドラッグ または ◀▶ で移動 / ✕で削除' : 'タップで入力（単語チップ）'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingTags(prev => !prev)}
                                            className={`px-3 py-1 rounded-lg text-xs font-black border transition-all active:scale-95 select-none ${
                                                isEditingTags
                                                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                                    : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-slate-600'
                                            }`}
                                        >
                                            {isEditingTags ? '✓ 完了' : '✏️ 編集'}
                                        </button>
                                    </div>

                                    {/* 編集モード時：新しい単語の追加フォーム */}
                                    {isEditingTags && (
                                        <div className="flex gap-1.5 mb-2.5 shrink-0 animate-[fadeIn_0.15s_ease-out]">
                                            <input
                                                type="text"
                                                placeholder="よく使う言葉を登録..."
                                                value={newTagInput}
                                                onChange={(e) => setNewTagInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleCreateTag();
                                                    }
                                                }}
                                                className="flex-1 border border-amber-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCreateTag}
                                                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black px-4 py-2 rounded-xl text-xs sm:text-sm shrink-0 shadow-xs active:scale-95 transition-all"
                                            >
                                                ＋ 追加
                                            </button>
                                        </div>
                                    )}

                                    {/* チップ一覧：編集時は高さ制限を解除して下まで全部見せる */}
                                    {currentTags.length > 0 ? (
                                        <div 
                                            className={`flex flex-wrap content-start gap-2 overflow-y-auto no-scrollbar py-1 select-none ${
                                                isEditingTags ? 'flex-1 pb-4' : 'max-h-48'
                                            }`}
                                        >
                                            {currentTags.map((tag, idx) => (
                                                isEditingTags ? (
                                                    <div
                                                        key={tag}
                                                        data-tag-index={idx}
                                                        onPointerDown={(e) => handlePointerDownChip(e, idx)}
                                                        style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
                                                        className={`px-2.5 py-2 rounded-xl border text-sm sm:text-base font-bold transition-transform flex items-center gap-1.5 cursor-grab active:cursor-grabbing ${
                                                            draggingIdx === idx
                                                                ? 'border-amber-500 bg-amber-300 dark:bg-amber-700 text-amber-950 dark:text-white scale-105 shadow-lg z-20 ring-2 ring-amber-400'
                                                                : 'border-amber-300 dark:border-slate-600 bg-amber-50/90 dark:bg-slate-800 text-gray-800 dark:text-slate-100 shadow-2xs'
                                                        }`}
                                                    >
                                                        {/* ◀ 前へ移動ボタン */}
                                                        {idx > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    moveTagOrder(idx, idx - 1);
                                                                    setDraggingIdx(null);
                                                                    draggingIdxRef.current = null;
                                                                }}
                                                                className="text-amber-700 dark:text-amber-300 bg-amber-200/60 dark:bg-slate-700 rounded px-1.5 py-0.5 text-xs font-black active:scale-90"
                                                                title="前へ移動"
                                                            >
                                                                ◀
                                                            </button>
                                                        )}

                                                        {/* チップ名（ここを指で掴んでドラッグ移動も可能） */}
                                                        <span className="px-1">{tag}</span>

                                                        {/* ▶ 次へ移動ボタン */}
                                                        {idx < currentTags.length - 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    moveTagOrder(idx, idx + 1);
                                                                    setDraggingIdx(null);
                                                                    draggingIdxRef.current = null;
                                                                }}
                                                                className="text-amber-700 dark:text-amber-300 bg-amber-200/60 dark:bg-slate-700 rounded px-1.5 py-0.5 text-xs font-black active:scale-90"
                                                                title="次へ移動"
                                                            >
                                                                ▶
                                                            </button>
                                                        )}

                                                        {/* ✕ 削除ボタン */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteTag(tag);
                                                            }}
                                                            className="ml-0.5 text-rose-600 dark:text-rose-400 font-black text-xs bg-rose-200/80 hover:bg-rose-300 dark:bg-rose-950/90 rounded-full w-5 h-5 flex items-center justify-center active:scale-90 transition-transform"
                                                            title="このチップを削除"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => handleAddTag(tag)}
                                                        className="px-3 py-2 rounded-xl border border-amber-200 dark:border-slate-700 bg-amber-50/70 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm sm:text-base font-bold text-amber-950 dark:text-amber-200 active:scale-95 transition-all shadow-2xs flex items-center gap-1.5"
                                                    >
                                                        <span className="text-amber-600 dark:text-amber-400 font-black text-xs">＋</span>
                                                        <span>{tag}</span>
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs font-bold text-gray-400 dark:text-slate-500 py-3 text-center border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                                            単語チップはありません（「✏️ 編集」から登録できます）
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* 最後のステップのAPIキー入力 */}
                    {aiCurrentStep === wizardSteps.length - 1 && (
                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 shrink-0">
                            <label className="text-xs font-black text-gray-500 dark:text-slate-400 flex justify-between items-center mb-1">
                                <span>🔑 Gemini APIキー</span>
                                {userApiKey.trim() && <span className="text-[10px] font-bold text-emerald-500">✓ 入力済</span>}
                            </label>
                            <input type="password" placeholder="APIキー" className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-800 text-sm font-medium text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-200" value={userApiKey} onChange={(e) => { setUserApiKey(e.target.value); localStorage.setItem('fishing_api_key', e.target.value); }} />
                        </div>
                    )}
                </div>

                {/* モーダルフッター */}
                <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe shrink-0 flex gap-2">
                    {aiCurrentStep > 0 && (
                        <button onClick={() => setAiCurrentStep(prev => prev - 1)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-black py-3 rounded-xl shadow-sm flex justify-center items-center text-sm">
                            <IconChevronLeft className="w-4 h-4 mr-1" /> 戻る
                        </button>
                    )}
                    {aiCurrentStep < wizardSteps.length - 1 ? (
                        <button onClick={() => setAiCurrentStep(prev => prev + 1)} className="flex-[2] bg-amber-500 dark:bg-amber-600 text-white font-black py-3 rounded-xl shadow-md flex justify-center items-center text-sm">
                            次へ <IconChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    ) : (
                        <button onClick={() => {
                            setShowAiInputModal(false);
                            handleAiGenerate(
                                targetRecordForAi,
                                aiInputData.condition,
                                aiInputData.scenery,
                                aiInputData.tide,
                                aiInputData.activity,
                                aiInputData.episode,
                                aiInputData.size,
                                aiInputData.topAngler,
                                aiInputData.patterns,
                                userApiKey
                            );
                        }} className="flex-[2] bg-amber-500 dark:bg-amber-600 text-white font-black py-3 rounded-xl shadow-md flex justify-center items-center text-sm">
                            文章を作成する
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// AI日報表示モーダル（ヘッダー再作成ボタン設置版）
// ==========================================
const AiResultModal = ({
    showAiModal,
    setShowAiModal,
    aiGeneratedPatterns,
    aiGeneratedText,
    handleCopyPattern,
    onRecreate // 再作成ハンドラーを受け取る
}) => {
    if (!showAiModal) return null;

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiModal(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col h-[85vh] animate-slideUpModal overflow-hidden">
                
                {/* ヘッダー：AIカルテ同様に右上の✕の隣にエメラルドグリーンの再作成ボタンを配置 */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-amber-50 dark:bg-slate-800 rounded-t-3xl shrink-0">
                    <h2 className="text-lg font-black text-amber-800 dark:text-amber-400 flex items-center">
                        <IconStar className="w-5 h-5 mr-1 text-amber-500" /> AI釣行日報
                    </h2>
                    
                    <div className="flex items-center gap-2">
                        {/* 🔄 再作成ボタン（AIカルテと同一規格のエメラルドグリーン） */}
                        {typeof onRecreate === 'function' && (
                            <button
                                type="button"
                                onClick={onRecreate}
                                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-sm transition-all flex items-center gap-1.5 select-none bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white active:scale-95"
                                title="条件を変更して再度作成する"
                            >
                                <span className="text-sm leading-none">🔄</span>
                                <span>再作成</span>
                            </button>
                        )}

                        {/* ✕ 閉じるボタン */}
                        <button 
                            type="button"
                            onClick={() => setShowAiModal(false)} 
                            className="w-9 h-9 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full font-bold shadow-sm text-gray-500 hover:bg-gray-100 text-base active:scale-95 transition-all select-none"
                            aria-label="閉じる"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* 本文エリア */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900/50 space-y-4 font-medium">
                    {aiGeneratedPatterns.length > 0 ? (
                        aiGeneratedPatterns.map((pattern, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-slate-700">
                                    <h3 className="font-bold text-sky-700 dark:text-sky-400 text-sm leading-tight pr-2">{pattern.title}</h3>
                                    <button onClick={() => handleCopyPattern(pattern.content)} className="bg-sky-100 text-sky-600 dark:bg-slate-700 dark:text-sky-400 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">コピー</button>
                                </div>
                                <p className="text-gray-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{pattern.content}</p>
                            </div>
                        ))
                    ) : (
                        <textarea readOnly className="w-full h-full min-h-[500px] bg-transparent resize-none focus:outline-none text-gray-800 dark:text-slate-200 leading-relaxed font-medium" value={aiGeneratedText}></textarea>
                    )}
                </div>

                {/* モーダルフッター */}
                <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe shrink-0">
                    <button onClick={() => setShowAiModal(false)} className="w-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 font-black py-3 rounded-xl shadow-sm flex justify-center items-center text-base">
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};
// ==========================================
// AI多角分析カルテモーダル（ヘッダー拡大＆回転スピナー版）
// ==========================================
const AiAnalysisModal = ({
    showAnalysisModal,
    setShowAnalysisModal,
    currentAnalysis,
    handleRunAiAnalysis,
    copyAnalysisText,
    handleCopyPattern,
    isAnalyzing // 分析中判定を受け取る
}) => {
    if (!showAnalysisModal || !currentAnalysis) return null;

    return (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAnalysisModal(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col h-[85vh] animate-slideUpModal overflow-hidden">
                
                {/* ヘッダー：タイトル・再分析ボタン・閉じるボタンをひと回り拡大 */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-emerald-50 dark:bg-slate-800 rounded-t-3xl shrink-0">
                    <h2 className="text-lg sm:text-xl font-black text-emerald-800 dark:text-emerald-400 flex items-center">
                        <IconChart className="w-5 h-5 sm:w-6 sm:h-6 mr-1.5 shrink-0" /> AI釣況・多角分析カルテ
                    </h2>
                    <div className="flex items-center gap-2.5">
                        {/* 🔄 再分析ボタン（ひと回り拡大 ＆ 分析中は回転スピナー） */}
                        <button 
                            type="button"
                            disabled={isAnalyzing}
                            onClick={() => {
                                if (isAnalyzing) return;
                                if (window.confirm(`${currentAnalysis.record.date} の釣況・メモデータをもとに再分析を実行しますか？`)) {
                                    handleRunAiAnalysis(currentAnalysis.record);
                                }
                            }} 
                            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-sm transition-all flex items-center gap-1.5 select-none ${
                                isAnalyzing
                                    ? 'bg-emerald-700/80 text-white cursor-wait opacity-90'
                                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white active:scale-95'
                            }`}
                        >
                            <span className={`text-sm leading-none inline-block ${isAnalyzing ? 'animate-spin' : ''}`}>
                                🔄
                            </span>
                            <span>{isAnalyzing ? '再分析中...' : '再分析'}</span>
                        </button>

                        {/* ✕ 閉じるボタン（ひと回り拡大：w-9 h-9、text-base） */}
                        <button 
                            type="button"
                            onClick={() => setShowAnalysisModal(false)} 
                            className="w-9 h-9 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full font-bold shadow-sm text-gray-500 hover:bg-gray-100 text-base active:scale-95 transition-all"
                            aria-label="閉じる"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* メインエリア */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                    
                    {/* 1. 難易度判定 */}
                    <div className="bg-emerald-100/60 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <span className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300 block mb-1">
                            📊 釣況難易度判定
                        </span>
                        <p className="font-black text-base sm:text-lg text-gray-800 dark:text-slate-100 leading-snug">
                            {currentAnalysis.data.difficulty}
                        </p>
                    </div>

                    {/* 2. トータル状況日報 */}
                    {currentAnalysis.data.totalSummaryReport && (
                        <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/40 dark:from-slate-800 dark:via-slate-800/90 dark:to-amber-950/20 p-4 rounded-xl border-2 border-amber-300 dark:border-amber-700/60 shadow-md space-y-2.5">
                            <div className="flex justify-between items-center border-b border-amber-200/80 dark:border-slate-700 pb-2">
                                <h4 className="text-xs sm:text-sm font-black text-amber-800 dark:text-amber-400 flex items-center">
                                    <IconStar className="w-4 h-4 mr-1 text-amber-500" /> 📝 トータル状況日報（公式HP・日報用 400字要約）
                                </h4>
                                <button 
                                    type="button"
                                    onClick={() => handleCopyPattern(currentAnalysis.data.totalSummaryReport)} 
                                    className="bg-amber-100 dark:bg-slate-700 hover:bg-amber-200 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-lg text-xs font-black shrink-0 border border-amber-300 dark:border-slate-600 active:scale-95 transition-all shadow-2xs"
                                >
                                    日報をコピー
                                </button>
                            </div>
                            <p className="text-sm sm:text-base leading-relaxed text-gray-800 dark:text-slate-200 font-medium whitespace-pre-wrap pt-0.5 select-text">
                                {currentAnalysis.data.totalSummaryReport}
                            </p>
                        </div>
                    )}

                    {/* 3. 釣り座・座席バイアス分析 */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-1.5">
                        <h4 className="text-xs sm:text-sm font-black text-sky-600 dark:text-sky-400 flex items-center">
                            🧭 釣り座・座席バイアス分析
                        </h4>
                        <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-slate-300 font-medium select-text">
                            {currentAnalysis.data.seatBiasAnalysis}
                        </p>
                    </div>

                    {/* 4. 海況・潮時相関分析 */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-1.5">
                        <h4 className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 flex items-center">
                            🌊 海況・潮時相関分析
                        </h4>
                        <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-slate-300 font-medium select-text">
                            {currentAnalysis.data.environmentCorrelation}
                        </p>
                    </div>

                    {/* 5. 竿頭の勝因・テクニカル考察 */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-1.5">
                        <h4 className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 flex items-center">
                            👑 竿頭の勝因・テクニカル考察
                        </h4>
                        <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-slate-300 font-medium select-text">
                            {currentAnalysis.data.topAnglerFactors}
                        </p>
                    </div>

                    {/* 6. 次回攻略へのアドバイス＆船長カルテ */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-1.5">
                        <h4 className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400 flex items-center">
                            💡 次回攻略へのアドバイス＆船長カルテ
                        </h4>
                        <p className="text-sm sm:text-base leading-relaxed text-gray-800 dark:text-slate-200 font-bold select-text">
                            {currentAnalysis.data.captainAdvice}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

window.MemoModal = MemoModal;
window.AiInputWizardModal = AiInputWizardModal;
window.AiResultModal = AiResultModal;
window.AiAnalysisModal = AiAnalysisModal;