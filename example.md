---
title: Imperative vs. Declarative Code
subtitle: "Sam Ly"
---

> Blockquote example. yay.
>
> - sam ly

```js
// this is a fenced code block.
addEventListener('load', () => {
  const code = document.querySelector('#code');
  const worker = new Worker('worker.js');
  worker.onmessage = (event) => { code.innerHTML = event.data; }
  worker.postMessage(code.textContent);
});
```