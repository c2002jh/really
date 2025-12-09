// start_lightuser_page_3.js — Final: precise left-icon alignment to each cards-group center
// - Renders Good/Bad groups from saved selections (genre_display prioritized).
// - Positions the left-side status icons so each icon's vertical center aligns exactly with its group's center.
// - Ensures the .status-column is a child of .results-wrap and uses absolute positioning as the reference.
// - Recomputes on resize / orientation change and after initial render so alignment stays stable.

(function () {
  const DEFAULT_ORDER = ["HIPHOP", "INDIE", "CLASSICAL", "EDM", "K-POP"];

  function normalizeGenreName(g) {
    if (!g) return "";
    return g
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9\-]/g, "");
  }

  function readSelections() {
    let sel = window.__NEUROTUNE_USER_SELECTIONS;
    if (!sel) {
      try {
        const raw = localStorage.getItem("neurotune_selections");
        if (raw) sel = JSON.parse(raw);
      } catch (e) {
        console.warn("Failed to parse stored selections", e);
      }
    }
    if (!Array.isArray(sel)) return [];
    return sel;
  }

  function buildGroups(selections) {
    const good = [];
    const bad = [];
    const seenGood = new Set();
    const seenBad = new Set();

    selections.forEach((s) => {
      const display = (s.genre_display || s.genre || s.genre_key || "")
        .toString()
        .trim();
      if (!display) return;
      const norm = normalizeGenreName(display);
      if (s.selection === "good") {
        if (!seenGood.has(norm)) {
          seenGood.add(norm);
          good.push({ raw: display, norm, meta: s });
        }
      } else {
        if (!seenBad.has(norm)) {
          seenBad.add(norm);
          bad.push({ raw: display, norm, meta: s });
        }
      }
    });

    return { good, bad };
  }

  function createCard(displayLabel, state, meta) {
    const card = document.createElement("div");
    card.className = "card";
    if (state === "good") card.classList.add("good");
    if (state === "bad") card.classList.add("bad");

    const txt = document.createElement("div");
    txt.className = "genre-text";

    const label =
      meta && meta.genre_display ? meta.genre_display : displayLabel;
    txt.textContent = String(label || displayLabel).toUpperCase();
    card.appendChild(txt);

    if (state) {
      const badge = document.createElement("div");
      badge.className = "badge";
      const img = document.createElement("img");
      img.src = state === "good" ? "icon/check2_icon.png" : "icon/x_icon.png";
      img.alt = state;
      img.width = 18;
      img.height = 18;
      badge.appendChild(img);
      card.appendChild(badge);
    }

    if (meta && (meta.title || meta.artist)) {
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      const labelText = meta.title || label;
      card.setAttribute("aria-label", `${labelText} by ${meta.artist || ""}`);
      card.addEventListener("click", () => {
        alert(`${meta.title || label}\n${meta.artist || ""}`);
      });
      card.addEventListener("keypress", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.click();
        }
      });
    }

    return card;
  }

  // Align status icons: ensure .status-column is child of .results-wrap and then position each .status-item
  function alignStatusIcons() {
    const wrap = document.querySelector(".results-wrap");
    if (!wrap) return;

    // ensure status-column is inside wrap (so positioning is relative to wrap)
    let statusColumn = wrap.querySelector(".status-column");
    if (!statusColumn) {
      // try to find it anywhere in document and move it
      const found = document.querySelector(".status-column");
      if (found) {
        statusColumn = found;
        wrap.insertBefore(statusColumn, wrap.firstChild);
      } else {
        // nothing to align
        return;
      }
    }

    // Reset status-column to be the positioning reference with top:0 inside wrap
    statusColumn.style.position = "absolute";
    statusColumn.style.top = "0px";
    // left is kept by CSS, but ensure it's readable - if CSS sets left via var, leave it
    // Make the statusColumn full height so absolute children can be placed by top in px
    statusColumn.style.height = `${wrap.clientHeight}px`;
    statusColumn.style.pointerEvents = "none";

    const mapping = [
      { groupSel: ".cards-good", statusSel: ".status-item.good" },
      { groupSel: ".cards-bad", statusSel: ".status-item.bad" },
    ];

    const wrapRect = wrap.getBoundingClientRect();

    mapping.forEach(({ groupSel, statusSel }) => {
      const group = document.querySelector(groupSel);
      const status = statusColumn.querySelector(statusSel);
      if (!group) {
        if (status) status.style.display = "none";
        return;
      }
      // if no status element, skip
      if (!status) return;

      // hide if group has no cards
      const firstChild = group.querySelector(".card");
      if (!firstChild) {
        status.style.display = "none";
        return;
      } else {
        status.style.display = "";
      }

      const grpRect = group.getBoundingClientRect();
      // group center relative to wrap (top of wrap is 0)
      const groupCenterY = grpRect.top - wrapRect.top + grpRect.height / 2;

      // position status item absolutely inside statusColumn so top is relative to statusColumn
      status.style.position = "absolute";
      status.style.left = status.style.left || ""; // keep CSS left if present
      status.style.top = `${Math.round(groupCenterY)}px`;
      // center the icon visually by translateY(-50%)
      status.style.transform = "translateY(-50%)";
      status.style.zIndex = 6;
      // ensure pointer-events none so it doesn't block clicks on cards
      status.style.pointerEvents = "none";
    });
  }

  // Debounced / RAF-scheduled align
  let alignRaf = null;
  function scheduleAlign() {
    if (alignRaf) cancelAnimationFrame(alignRaf);
    alignRaf = requestAnimationFrame(() => {
      alignStatusIcons();
      alignRaf = null;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const wrapGood = document.querySelector(".cards-good");
    const wrapBad = document.querySelector(".cards-bad");
    const wrap = document.querySelector(".results-wrap");
    let statusColumn = document.querySelector(".status-column");

    if (!wrapGood || !wrapBad || !wrap) {
      console.error("cards container or results-wrap not found");
      return;
    }

    // If status-column exists elsewhere in DOM, move it into wrap for correct absolute positioning
    if (statusColumn && statusColumn.parentElement !== wrap) {
      wrap.insertBefore(statusColumn, wrap.firstChild);
    }

    const selections = readSelections();
    const groups = buildGroups(selections);

    // Render cards
    if (groups.good.length === 0 && groups.bad.length === 0) {
      DEFAULT_ORDER.forEach((label) => {
        const card = createCard(label, null, null);
        if (wrapGood.children.length < 2) wrapGood.appendChild(card);
        else wrapBad.appendChild(card);
      });
    } else {
      groups.good.forEach((g) => {
        const card = createCard(g.raw, "good", g.meta);
        wrapGood.appendChild(card);
      });
      groups.bad.forEach((g) => {
        const card = createCard(g.raw, "bad", g.meta);
        wrapBad.appendChild(card);
      });
    }

    // After rendering, schedule alignment multiple times to account for font/image load
    scheduleAlign();
    setTimeout(scheduleAlign, 120);
    setTimeout(scheduleAlign, 400);
    setTimeout(scheduleAlign, 900);

    // Re-align on window resize and orientation change
    window.addEventListener("resize", scheduleAlign);
    window.addEventListener("orientationchange", scheduleAlign);

    // Also observe layout changes in the wrap (cards added/removed)
    const mo = new MutationObserver(scheduleAlign);
    mo.observe(wrap, { childList: true, subtree: true, attributes: true });

    // Expose manual align for debugging
    window.__ALIGN_NEUROTUNE_STATUS_ICONS = alignStatusIcons;
  });
})();
