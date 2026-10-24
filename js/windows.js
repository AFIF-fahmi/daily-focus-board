(function () {
  const layoutKey = "daily-focus-board-freeform-layout";
  const icons = { tasks: "✓", deadlines: "!", schedule: "☰", interests: "✦", pomo: "⏱" };
  let topZ = 10;

  function locked() {
    return document.body.classList.contains("interaction-locked");
  }

  function readLayout() {
    try { return JSON.parse(localStorage.getItem(layoutKey) || "{}"); } catch { return {}; }
  }

  function saveLayout(cards) {
    const layout = readLayout();
    cards.forEach(card => {
      const windowName = card.dataset.window;
      if (card.classList.contains("is-minimized")) {
        layout[windowName] = { ...(layout[windowName] || {}), minimized: true };
      } else {
        layout[windowName] = {
          left: card.offsetLeft,
          top: card.offsetTop,
          width: card.offsetWidth,
          height: card.offsetHeight,
          z: Number(card.style.zIndex) || 1,
          minimized: false,
        };
      }
    });
    localStorage.setItem(layoutKey, JSON.stringify(layout));
  }

  function defaultLayout(index) {
    const columns = 3;
    const gap = 24;
    const width = Math.max(260, Math.min(390, Math.floor((window.innerWidth - gap * 4) / columns)));
    const height = Math.max(190, Math.min(300, Math.floor((window.innerHeight - 190) / 2)));
    return {
      left: gap + (index % columns) * (width + gap),
      top: 150 + Math.floor(index / columns) * (height + gap),
      width,
      height,
      z: index + 1,
    };
  }

  function applyLayout(card, data, index) {
    const layout = data || defaultLayout(index);
    const maxLeft = Math.max(0, window.innerWidth - layout.width);
    const maxTop = Math.max(0, window.innerHeight - layout.height);
    card.style.left = `${Math.max(0, Math.min(layout.left, maxLeft))}px`;
    card.style.top = `${Math.max(100, Math.min(layout.top, maxTop))}px`;
    card.style.width = `${Math.max(240, layout.width)}px`;
    card.style.height = `${Math.max(160, layout.height)}px`;
    card.style.zIndex = String(layout.z || index + 1);
  }

  function bringToFront(card) {
    card.style.zIndex = String(++topZ);
  }

  function addResizeHandles(card) {
    ["n", "e", "s", "w", "ne", "se", "sw", "nw"].forEach(direction => {
      const handle = document.createElement("span");
      handle.className = `resize-handle resize-${direction}`;
      handle.dataset.resize = direction;
      handle.setAttribute("aria-hidden", "true");
      card.appendChild(handle);
    });
  }

  function setupCard(card, minimizedWindows, layout, index) {
    const title = card.querySelector("h2").textContent;
    const windowName = card.dataset.window;
    const tools = document.createElement("div");
    tools.className = "window-tools";
    const addButton = ["tasks", "deadlines", "schedule", "interests"].includes(windowName)
      ? `<button class="window-add" type="button" aria-label="Tambah ke ${title}" title="Quick add">+</button>` : "";
    tools.innerHTML = `<button class="window-pin" type="button" aria-label="Kunci posisi ${title}" title="Kunci posisi"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i></button>${addButton}<button class="window-minimize" type="button" aria-label="Minimalkan ${title}" title="Minimalkan">−</button>`;
    card.appendChild(tools);
    addResizeHandles(card);
    applyLayout(card, layout[windowName], index);

    const minimizeCard = () => {
      if (card.classList.contains("is-minimized")) return;
      card.classList.add("is-minimized");
      const icon = document.createElement("button");
      icon.className = "minimized-icon";
      icon.type = "button";
      icon.dataset.window = windowName;
      icon.textContent = icons[windowName] || "□";
      icon.title = `Tampilkan ${title}`;
      icon.setAttribute("aria-label", `Tampilkan ${title}`);
      icon.onclick = () => {
        if (locked()) return;
        card.classList.remove("is-minimized");
        icon.remove();
        bringToFront(card);
        saveLayout([...document.querySelectorAll(".window-card")]);
      };
      minimizedWindows.appendChild(icon);
      saveLayout([...document.querySelectorAll(".window-card")]);
    };

    tools.querySelector(".window-add")?.addEventListener("click", event => {
      event.stopPropagation();
      if (!locked()) window.quickAdd(windowName);
    });
    tools.querySelector(".window-pin").onclick = event => {
      event.stopPropagation();
      if (locked()) return;
      const pinned = card.dataset.pinned !== "true";
      card.dataset.pinned = String(pinned);
      card.classList.toggle("is-pinned", pinned);
      event.currentTarget.setAttribute("aria-pressed", String(pinned));
    };
    tools.querySelector(".window-minimize").onclick = event => {
      event.stopPropagation();
      if (locked()) return;
      minimizeCard();
    };

    card.addEventListener("pointerdown", () => bringToFront(card));
    card.querySelectorAll("h2, .pomo-heading").forEach(header => {
      header.addEventListener("pointerdown", event => {
        if (locked() || card.dataset.pinned === "true" || event.target.closest("button")) return;
        event.preventDefault();
        bringToFront(card);
        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = card.offsetLeft;
        const startTop = card.offsetTop;
        const move = moveEvent => {
          card.style.left = `${Math.max(0, Math.min(window.innerWidth - card.offsetWidth, startLeft + moveEvent.clientX - startX))}px`;
          card.style.top = `${Math.max(100, Math.min(window.innerHeight - card.offsetHeight, startTop + moveEvent.clientY - startY))}px`;
        };
        const stop = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", stop);
          saveLayout([...document.querySelectorAll(".window-card")]);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop, { once: true });
      });
    });

    card.querySelectorAll(".resize-handle").forEach(handle => {
      handle.addEventListener("pointerdown", event => {
        if (locked() || card.dataset.pinned === "true") return;
        event.preventDefault();
        event.stopPropagation();
        bringToFront(card);
        const direction = handle.dataset.resize;
        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = card.offsetLeft;
        const startTop = card.offsetTop;
        const startWidth = card.offsetWidth;
        const startHeight = card.offsetHeight;
        const resize = resizeEvent => {
          let left = startLeft;
          let top = startTop;
          let width = startWidth;
          let height = startHeight;
          const dx = resizeEvent.clientX - startX;
          const dy = resizeEvent.clientY - startY;
          if (direction.includes("e")) width = startWidth + dx;
          if (direction.includes("s")) height = startHeight + dy;
          if (direction.includes("w")) { width = startWidth - dx; left = startLeft + dx; }
          if (direction.includes("n")) { height = startHeight - dy; top = startTop + dy; }
          width = Math.max(240, Math.min(width, window.innerWidth - left));
          height = Math.max(160, Math.min(height, window.innerHeight - top));
          if (left < 0) { width += left; left = 0; }
          if (top < 100) { height += top - 100; top = 100; }
          card.style.left = `${left}px`;
          card.style.top = `${top}px`;
          card.style.width = `${width}px`;
          card.style.height = `${height}px`;
        };
        const stop = () => {
          window.removeEventListener("pointermove", resize);
          window.removeEventListener("pointerup", stop);
          saveLayout([...document.querySelectorAll(".window-card")]);
        };
        window.addEventListener("pointermove", resize);
        window.addEventListener("pointerup", stop, { once: true });
      });
    });

    return { minimizeCard };
  }

  window.setupWindows = function setupWindows() {
    const workspace = document.getElementById("workspace");
    const minimizedWindows = document.getElementById("minimizedWindows");
    const cards = [...workspace.querySelectorAll(".window-card")];
    const layout = readLayout();
    const controls = cards.map((card, index) => setupCard(card, minimizedWindows, layout, index));
    const pomo = cards.find(card => card.dataset.window === "pomo");
    cards.forEach((card, index) => {
      const savedState = layout[card.dataset.window];
      if (savedState?.minimized || (card === pomo && savedState?.minimized !== false)) controls[index].minimizeCard();
    });
    topZ = Math.max(...cards.map(card => Number(card.style.zIndex) || 1), 10);
    document.getElementById("resetLayout").onclick = () => {
      if (locked()) return;
      localStorage.removeItem(layoutKey);
      cards.forEach((card, index) => applyLayout(card, null, index));
      bringToFront(cards[0]);
      saveLayout(cards);
    };
    window.addEventListener("resize", () => cards.forEach(card => {
      const left = Math.min(card.offsetLeft, window.innerWidth - card.offsetWidth);
      const top = Math.max(100, Math.min(card.offsetTop, window.innerHeight - card.offsetHeight));
      card.style.left = `${Math.max(0, left)}px`;
      card.style.top = `${top}px`;
      saveLayout(cards);
    }));
  };
})();
