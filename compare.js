(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const KEY = "buscapromo_compare_v211";

  const form = $("compareForm");
  const productInput = $("compareProduct");
  const storeInput = $("compareStore");
  const priceInput = $("comparePrice");
  const shippingInput = $("compareShipping");
  const tbody = $("compareRows");
  const summary = $("compareSummary");
  const status = $("compareStatus");
  const clearButton = $("clearCompare");

  if (!form || !productInput || !storeInput || !priceInput ||
      !shippingInput || !tbody || !summary || !status) {
    console.error("Busca Promo: confira os elementos do comparador no index.html.");
    return;
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
    status.classList.toggle("success", !isError);
  }

  function money(value) {
    const number = Number(value);
    return (Number.isFinite(number) ? number : 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function readItems() {
    try {
      const stored = localStorage.getItem(KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new Error("Formato inválido");
      return parsed.filter(item => item && typeof item === "object");
    } catch (error) {
      showStatus("Não foi possível ler os preços salvos. Os dados originais foram preservados.", true);
      return [];
    }
  }

  function saveItems(items) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      render();
      return true;
    } catch (error) {
      showStatus("Não foi possível salvar. Verifique o espaço e as permissões do navegador.", true);
      return false;
    }
  }

  function normalizedProduct(value) {
    return String(value || "").trim().toLocaleLowerCase("pt-BR");
  }

  function totalOf(item) {
    return Number(item.price) + Number(item.shipping || 0);
  }

  function ensureSection(id, title, after) {
    let section = $(id);
    if (!section) {
      section = document.createElement("section");
      section.id = id;
      section.className = "compare-extra-section";
      after.insertAdjacentElement("afterend", section);
    }
    section.replaceChildren();
    const heading = document.createElement("h3");
    heading.textContent = title;
    section.append(heading);
    return section;
  }

  const historyArea = ensureSection("compareHistory", "Histórico de preços", status);
  const chartArea = ensureSection("comparePriceChart", "Gráfico de evolução dos preços", historyArea);

  function renderHistory(items) {
    historyArea.replaceChildren();
    const heading = document.createElement("h3");
    heading.textContent = "Histórico de preços";
    historyArea.append(heading);

    if (!items.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nenhum registro no histórico ainda.";
      historyArea.append(empty);
      return;
    }

    const groups = new Map();
    items.forEach(item => {
      const key = normalizedProduct(item.product);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    groups.forEach(records => {
      const details = document.createElement("details");
      details.className = "history-product";
      const title = document.createElement("summary");
      title.textContent = `${records[0].product || "Produto sem nome"} — ${records.length} registro(s)`;
      details.append(title);
      const list = document.createElement("ul");

      [...records].sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0))
        .forEach(item => {
          const li = document.createElement("li");
          const date = item.recordedAt ? new Date(item.recordedAt) : null;
          const dateText = date && !Number.isNaN(date.getTime())
            ? date.toLocaleString("pt-BR")
            : "Data não registrada (preço antigo)";
          li.textContent = `${dateText} — ${item.store || "Loja"}: ${money(item.price)} + frete ${money(item.shipping || 0)} = ${money(totalOf(item))}`;
          list.append(li);
        });
      details.append(list);
      historyArea.append(details);
    });
  }
    function renderChart(items) {
    chartArea.replaceChildren();
    const heading = document.createElement("h3");
    heading.textContent = "Gráfico de evolução dos preços";
    chartArea.append(heading);

    const groups = new Map();
    items.forEach(item => {
      if (!item.recordedAt || Number.isNaN(new Date(item.recordedAt).getTime())) return;
      const key = normalizedProduct(item.product);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    if (!groups.size) {
      const message = document.createElement("p");
      message.textContent = "Registre preços com data para visualizar o gráfico.";
      chartArea.append(message);
      return;
    }

    const label = document.createElement("label");
    label.textContent = "Escolha o produto: ";
    const select = document.createElement("select");
    select.id = "chartProductSelect";

    groups.forEach((records, key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = records[0].product;
      select.append(option);
    });

    label.append(select);
    chartArea.append(label);

    const graph = document.createElement("div");
    graph.id = "priceChartDrawing";
    graph.style.width = "100%";
    graph.style.marginTop = "12px";
    chartArea.append(graph);

    function draw() {
      graph.replaceChildren();

      const records = [...(groups.get(select.value) || [])]
        .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

      if (!records.length) return;

      if (records.length < 2) {
        const note = document.createElement("p");
        note.textContent = "Registre mais um preço deste produto para comparar a evolução.";
        graph.append(note);
      }

      const width = 700, height = 300, left = 82, right = 24, top = 22, bottom = 58;
      const plotW = width - left - right, plotH = height - top - bottom;
      const values = records.map(totalOf);

      let min = Math.min(...values), max = Math.max(...values);

      if (min === max) {
        min = Math.max(0, min - 5);
        max += 5;
      } else {
        const pad = (max - min) * 0.15;
        min = Math.max(0, min - pad);
        max += pad;
      }

      const x = i => records.length === 1 ? left + plotW / 2 : left + i * plotW / (records.length - 1);
      const y = value => top + (max - value) * plotH / (max - min);
      const ns = "http://www.w3.org/2000/svg";

      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", "100%");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", `Evolução dos preços de ${records[0].product}`);

      function line(x1, y1, x2, y2, color = "#cccccc") {
        const el = document.createElementNS(ns, "line");
        [["x1", x1], ["y1", y1], ["x2", x2], ["y2", y2]]
          .forEach(([k, v]) => el.setAttribute(k, v));
        el.setAttribute("stroke", color);
        el.setAttribute("stroke-width", "1");
        svg.append(el);
      }

      for (let i = 0; i <= 4; i++) {
        const value = min + (max - min) * i / 4;
        const py = y(value);
        line(left, py, width - right, py);

        const tick = document.createElementNS(ns, "text");
        tick.setAttribute("x", left - 8);
        tick.setAttribute("y", py + 4);
        tick.setAttribute("text-anchor", "end");
        tick.setAttribute("font-size", "11");
        tick.setAttribute("fill", "currentColor");
        tick.textContent = money(value);
        svg.append(tick);
      }

      line(left, top, left, height - bottom);
      line(left, height - bottom, width - right, height - bottom);

      if (records.length > 1) {
        const polyline = document.createElementNS(ns, "polyline");
        polyline.setAttribute("points", records.map((item, i) =>
          `${x(i)},${y(totalOf(item))}`).join(" "));
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", "#16834a");
        polyline.setAttribute("stroke-width", "3");
        svg.append(polyline);
      }

      records.forEach((item, i) => {
        const point = document.createElementNS(ns, "circle");
        point.setAttribute("cx", x(i));
        point.setAttribute("cy", y(totalOf(item)));
        point.setAttribute("r", "6");
        point.setAttribute("fill", "#16834a");

        const tip = document.createElementNS(ns, "title");
        tip.textContent = `${new Date(item.recordedAt).toLocaleString("pt-BR")} — ${item.store}: ${money(totalOf(item))}`;
        point.append(tip);
        svg.append(point);

        const dateLabel = document.createElementNS(ns, "text");
        dateLabel.setAttribute("x", x(i));
        dateLabel.setAttribute("y", height - bottom + 20);
        dateLabel.setAttribute("text-anchor", "middle");
        dateLabel.setAttribute("font-size", "10");
        dateLabel.setAttribute("fill", "currentColor");
        dateLabel.textContent = new Date(item.recordedAt).toLocaleDateString("pt-BR");
        svg.append(dateLabel);
      });

      graph.append(svg);

      const first = totalOf(records[0]), last = totalOf(records[records.length - 1]);
      const result = document.createElement("p");

      if (records.length === 1) {
        result.textContent = `Preço registrado: ${money(last)}.`;
      } else {
        const delta = last - first;
        const direction = delta < 0 ? "diminuiu" : delta > 0 ? "aumentou" : "permaneceu igual";
        result.textContent = `O preço ${direction} ${money(Math.abs(delta))} entre o primeiro e o último registro.`;
      }

      graph.append(result);
    }

    select.addEventListener("change", draw);
    draw();
  }
    function render() {
    const originalItems = readItems();
    tbody.replaceChildren();
    renderHistory(originalItems);
    renderChart(originalItems);

    const items = originalItems.map((item, index) => ({
      ...item,
      index,
      total: totalOf(item)
    })).sort((a, b) => a.total - b.total);

    if (!items.length) {
      summary.textContent = "Nenhum preço registrado ainda.";
      summary.className = "compare-summary empty";
      return;
    }

    const best = items[0].total;

    items.forEach(item => {
      const row = document.createElement("tr");

      if (item.total === best) row.className = "best-price";

      [
        item.product,
        item.store,
        money(item.price),
        money(item.shipping || 0),
        money(item.total)
      ].forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = value;

        if (index === 4 && item.total === best) {
          const tag = document.createElement("span");
          tag.className = "best-tag";
          tag.textContent = "Menor total";
          cell.append(" ", tag);
        }

        row.append(cell);
      });

      const actionCell = document.createElement("td");
      const remove = document.createElement("button");

      remove.type = "button";
      remove.className = "remove";
      remove.textContent = "Excluir";

      remove.addEventListener("click", () => {
        const current = readItems();
        current.splice(item.index, 1);

        if (saveItems(current)) {
          showStatus("Preço removido do comparador e do histórico.");
        }
      });

      actionCell.append(remove);
      row.append(actionCell);
      tbody.append(row);
    });

    summary.className = "compare-summary";
    summary.textContent =
      `Menor preço total: ${money(best)} — ${items[0].store} (${items[0].product}).`;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const product = productInput.value.trim();
    const store = storeInput.value.trim();
    const price = Number(priceInput.value);
    const shipping = Number(shippingInput.value || 0);

    if (
      !product ||
      !store ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(shipping) ||
      shipping < 0
    ) {
      showStatus("Preencha produto, loja, preço válido e frete igual ou maior que zero.", true);
      return;
    }

    const items = readItems();
    const key = normalizedProduct(product);

    const previous = items
      .filter(item => normalizedProduct(item.product) === key)
      .sort((a, b) =>
        new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)
      )[0];

    const newTotal = price + shipping;

    const record = {
      product,
      store,
      price,
      shipping,
      recordedAt: new Date().toISOString()
    };

    items.push(record);

    if (saveItems(items)) {
      form.reset();
      shippingInput.value = "0";

      if (previous && newTotal < totalOf(previous)) {
        showStatus(
          `Preço registrado! Atenção: o total caiu de ${money(totalOf(previous))} para ${money(newTotal)} em relação ao registro anterior.`
        );
      } else {
        showStatus("Preço registrado com sucesso. Histórico e gráfico atualizados.");
      }
    }
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const items = readItems();

      if (!items.length) {
        showStatus("Não há preços para limpar.");
        return;
      }

      if (!window.confirm(
        "Tem certeza de que deseja apagar todos os preços e o histórico deste navegador?"
      )) return;

      if (saveItems([])) {
        showStatus("Comparação e histórico limpos.");
      }
    });
  }

  render();
  showStatus("Comparador pronto para registrar preços, histórico e gráficos.");
})();
