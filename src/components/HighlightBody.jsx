import React, { useCallback, useRef, useState } from 'react';
import { getSelectionOffsets, splitByRanges, mergeRanges } from '../lib/utils';

/**
 * 학생 일지 본문 표시.
 * editable=true 이면 드래그 후 '칭찬 마크 남기기' 버튼이 뜹니다.
 */
export default function HighlightBody({ text = '', highlights = [], editable = false, onChange }) {
  const ref = useRef(null);
  const [pop, setPop] = useState(null);

  const parts = splitByRanges(text, highlights);

  const handleMouseUp = useCallback(() => {
    if (!editable) return;
    const sel = getSelectionOffsets(ref.current);
    if (!sel) {
      setPop(null);
      return;
    }
    setPop({
      start: sel.start,
      end: sel.end,
      x: sel.rect.left + sel.rect.width / 2,
      y: sel.rect.top,
    });
  }, [editable]);

  const addMark = () => {
    if (!pop) return;
    const next = mergeRanges([...highlights, { start: pop.start, end: pop.end }]);
    onChange?.(next);
    window.getSelection()?.removeAllRanges();
    setPop(null);
  };

  return (
    <>
      <div
        ref={ref}
        className={`body-text ${editable ? 'selectable' : ''}`}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        {parts.map((p, i) =>
          p.mark ? (
            <mark className="praise" key={i}>
              {p.text}
            </mark>
          ) : (
            <React.Fragment key={i}>{p.text}</React.Fragment>
          )
        )}
      </div>

      {pop && (
        <button className="praise-pop" style={{ left: pop.x, top: pop.y }} onMouseDown={(e) => e.preventDefault()} onClick={addMark}>
          칭찬 마크 남기기
        </button>
      )}

      {editable && highlights.length > 0 && (
        <div className="row" style={{ marginTop: 10 }}>
          <span className="counter">칭찬 문장 {highlights.length}개</span>
          <button className="btn ghost sm" onClick={() => onChange?.([])}>
            모두 지우기
          </button>
        </div>
      )}
    </>
  );
}
