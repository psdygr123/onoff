/* 공통 UI 도구: 이스케이프, 로고, 아이콘, 폼 필드, 검증, 토스트 */
window.OnOff = window.OnOff || {};
OnOff.UI = (function () {
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const logo = (size) => `<svg width="${size || 36}" height="${Math.round((size || 36) * 0.56)}" viewBox="0 0 36 20" aria-hidden="true" focusable="false">
    <rect x="1" y="1" width="34" height="18" rx="9" fill="var(--bg-2)" stroke="var(--accent)" stroke-width="2"/>
    <circle cx="26" cy="10" r="6" fill="var(--accent)"/></svg>`;

  const icons = {
    compass: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    branch: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v12"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M18 8.5c0 5-6 4-12 6.5"/></svg>',
    link: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    soon: '<svg width="56" height="56" viewBox="0 0 36 20" aria-hidden="true"><rect x="1" y="1" width="34" height="18" rx="9" fill="none" stroke="var(--bronze)" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="10" cy="10" r="5" fill="none" stroke="var(--bronze)" stroke-width="1.6"/></svg>'
  };

  /* 폼 필드 한 개: 라벨, 입력, 힌트, 오류 자리를 같은 구조로 만듭니다. */
  function field(o) {
    const id = o.id, hint = o.hint ? `<div class="hint" id="${id}-hint">${o.hint}</div>` : "";
    const desc = [o.hint ? id + "-hint" : "", id + "-err"].filter(Boolean).join(" ");
    const input = o.area
      ? `<textarea id="${id}" name="${o.name || id}" maxlength="${o.max || 200}" aria-describedby="${desc}">${esc(o.value || "")}</textarea>`
      : `<input id="${id}" name="${o.name || id}" type="${o.type || "text"}" value="${esc(o.value || "")}" autocomplete="${o.auto || "off"}" aria-describedby="${desc}" ${o.required ? 'aria-required="true"' : ""} ${o.disabled ? "disabled" : ""}>`;
    return `<div class="field" data-field="${id}"><label for="${id}">${o.label}${o.required ? "" : ' <span class="hint">(선택)</span>'}</label>${hint}${input}<div class="err-msg" id="${id}-err" role="alert"></div></div>`;
  }

  function checks(name, items, selected, type, cols) {
    return `<fieldset class="choices ${cols ? "cols" : ""}" style="border:0">` + items.map((it) => `<label class="choice"><input type="${type}" name="${name}" value="${it.id}" ${selected.includes(it.id) ? "checked" : ""}><span>${it.label}</span></label>`).join("") + "</fieldset>";
  }

  const V = {
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "이메일 형식으로 입력해 주세요. 예: name@example.com"),
    password: (v) => (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? "" : "비밀번호는 8자 이상, 영문과 숫자를 함께 넣어 주세요."),
    required: (v, msg) => (v.trim() ? "" : msg || "필수 항목입니다.")
  };

  function setError(root, id, msg) {
    const f = root.querySelector(`[data-field="${id}"]`);
    if (!f) return;
    const e = f.querySelector(".err-msg");
    f.classList.toggle("invalid", !!msg);
    const input = f.querySelector("input,textarea");
    if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (e) e.textContent = msg || "";
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3600);
  }

  const val = (root, name) => { const el = root.querySelector(`[name="${name}"]`); return el ? el.value : ""; };
  const vals = (root, name) => Array.from(root.querySelectorAll(`[name="${name}"]:checked`)).map((e) => e.value);

  return { esc, logo, icons, field, checks, V, setError, toast, val, vals };
})();
