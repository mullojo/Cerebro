import { createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createTextVNode as _createTextVNode, normalizeClass as _normalizeClass, toDisplayString as _toDisplayString, createStaticVNode as _createStaticVNode } from "https://esm.sh/vue@3.5.45"

const _hoisted_1 = { class: "min-h-dvh bg-canvas" }
const _hoisted_2 = { class: "mx-auto max-w-2xl px-5 pt-12 pb-8 sm:px-8 sm:pt-20" }
const _hoisted_3 = {
  class: "mt-9 flex flex-col items-center rounded-2xl border border-forest-200 bg-forest-100/60 px-5 py-9 sm:py-12",
  "aria-label": "Interactive JavaScript example"
}
const _hoisted_4 = ["onClick"]
const _hoisted_5 = {
  class: "mt-4 text-center text-xs leading-6 text-muted",
  role: "status",
  "aria-live": "polite"
}

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _cache[6] || (_cache[6] = _createStaticVNode("<header class=\"mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-6 sm:px-8\"><a href=\"/\" class=\"btn-quiet -ml-3 text-sm\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" class=\"size-4\" aria-hidden=\"true\"><path d=\"M20 12H4m6-6-6 6 6 6\"></path></svg>Cerebro workspace</a><span class=\"hidden rounded-full border border-line bg-paper px-3 py-1 text-[10px] font-medium text-muted sm:block\">Vue 3 · Tailwind CSS 4</span></header>", 1)),
    _createElementVNode("main", _hoisted_2, [
      _cache[2] || (_cache[2] = _createElementVNode("p", { class: "eyebrow mb-5" }, "YOUR BROWSER PLAYGROUND", -1 /* CACHED */)),
      _cache[3] || (_cache[3] = _createElementVNode("h1", { class: "font-display text-5xl leading-[1.08] tracking-[-0.04em] sm:text-6xl" }, [
        _createTextVNode("Big things start"),
        _createElementVNode("br"),
        _createTextVNode("with a little spark.")
      ], -1 /* CACHED */)),
      _cache[4] || (_cache[4] = _createElementVNode("p", { class: "mt-6 max-w-lg text-base leading-7 text-muted" }, "A working starting point for your next idea. Make a copy with your chat, and turn it into something useful.", -1 /* CACHED */)),
      _createElementVNode("section", _hoisted_3, [
        (_openBlock(), _createElementBlock("svg", {
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": ".8",
          class: _normalizeClass(["size-24 transition-transform duration-300 motion-reduce:transition-none", [_ctx.rotation, _ctx.color]]),
          "aria-hidden": "true"
        }, [...(_cache[0] || (_cache[0] = [
          _createElementVNode("path", { d: "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z" }, null, -1 /* CACHED */)
        ]))], 2 /* CLASS */)),
        _createElementVNode("button", {
          type: "button",
          class: "btn-primary mt-7",
          onClick: $event => (_ctx.sparks++)
        }, [...(_cache[1] || (_cache[1] = [
          _createTextVNode("Give it a spark", -1 /* CACHED */),
          _createElementVNode("span", { "aria-hidden": "true" }, "↗", -1 /* CACHED */)
        ]))], 8 /* PROPS */, _hoisted_4),
        _createElementVNode("p", _hoisted_5, _toDisplayString(_ctx.sparks ? `${_ctx.sparks} ${_ctx.sparks === 1 ? 'spark' : 'sparks'}. What shall we build next?` : 'A little JavaScript, ready to go.'), 1 /* TEXT */)
      ]),
      _cache[5] || (_cache[5] = _createStaticVNode("<div class=\"mt-6 flex items-start gap-3 rounded-xl border border-line bg-paper p-4\"><span class=\"mt-0.5 font-mono text-xs text-forest-600\" aria-hidden=\"true\">&lt;/&gt;</span><div><h2 class=\"text-xs font-semibold\">Make it your own</h2><p class=\"mt-1 text-xs leading-6 text-muted\">Ask your chat to copy this starter and describe what you want to build. This demo resets when you reload.</p></div></div><footer class=\"mt-9 border-t border-line pt-5 text-[10px] leading-5 text-muted\">Native browser modules. Pinned CDN dependencies. A space to play.</footer>", 2))
    ])
  ]))
}
