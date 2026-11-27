
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = $("compareForm");
  const tbody = $("compareRows");
  const summary = $("compareSummary");
  const status = $("compareStatus");
  const KEY = "buscapromo_compare_v211";

  if (!form || !tbody || !summary) return;

  let history = $("compareHistory");

  if (!history) {
    history = document.createElement("section");
    history.id = "compareHistory";
    history.className = "compare-history";
    summary.insertAdjacentElement("afterend", history);
  }

  let chartArea = $("comparePriceChart");

  if (!chartArea) {
    chartArea = document.createElement("section");
    chartArea.id = "comparePriceChart";
    chartArea.className = "compare-price-chart";
    history.insertAdjacentElement("afterend", chartArea);
  }

  function readItems() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      showStatus("Não foi possível ler os preços salvos neste navegador.", true);
      return [];
    }
  }

  function money(value) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function showStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", isError);
    status.classList.toggle("success", !isError);
  }

  function saveItems(items) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      render();
      return true;
    } catch (error) {
      showStatus("O navegador bloqueou o armazenamento. Verifique as permissões ou o espaço disponível.", true);
      return false;
    }
  }

  function getGroups(items) {
    const groups = new Map();

    items.forEach(item => {
      const product = String(item.product || "Produto sem nome");
      const key = product.trim().toLocaleLowerCase("pt-BR");

      if (!groups.has(key)) {
        groups.set(key, { name: product, records: [] });
      }

      groups.get(key).records.push(item);
    });

    return groups;
  }

  function renderHistory(items) {
    history.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Histórico de preços";
    history.append(heading);

    if (!items.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nenhum registro no histórico ainda.";
      history.append(empty);
      return;
    }

    getGroups(items).forEach(group => {
      const details = document.createElement("details");
      details.className = "history-product";

      const title = document.createElement("summary");
      title.textContent = `${group.name} — ${group.records.length} registro(s)`;
      details.append(title);

      const list = document.createElement("ul");

      group.records.sort((a, b) =>
        new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)
      );

      group.records.forEach(item => {
        const li = document.createElement("li");
        const total = Number(item.price) + Number(item.shipping || 0);

        let dateText = "Data não registrada (preço antigo)";

        if (item.recordedAt) {
          const date = new Date(item.recordedAt);

          if (!Number.isNaN(date.getTime())) {
            dateText = date.toLocaleString("pt-BR");
          }
        }

        li.textContent =
          `${dateText} — ${item.store}: ${money(item.price)} ` +
          `+ frete ${money(item.shipping || 0)} = ${money(total)}`;

        list.append(li);
      });

      details.append(list);
      history.append(details);
    });
  }

  function renderChart(items) {
    chartArea.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Gráfico de evolução dos preços";
    chartArea.append(heading);

    const groups = getGroups(items);
    const validGroups = [...groups.entries()].filter(([, group]) =>
      group.records.some(item =>
        item.recordedAt && !Number.isNaN(new Date(item.recordedAt).getTime())
      )
    );

    if (!validGroups.length) {
      const message = document.createElement("p");
      message.textContent = "Registre preços com data para visualizar o gráfico.";
      chartArea.append(message);
      return;
    }

    const label = document.createElement("label");
    label.textContent = "Escolha o produto: ";

    const select = document.createElement("select");
    select.id = "chartProductSelect";

    validGroups.forEach(([key, group]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = group.name;
      select.append(option);
    });

    label.append(select);
    chartArea.append(label);

    const graph = document.createElement("div");
    graph.id = "priceChartDrawing";
    graph.style.width = "100%";
    graph.style.marginTop = "16px";
    chartArea.append(graph);

    function drawSelectedProduct() {
      graph.replaceChildren();

      const group = groups.get(select.value);

      const records = group.records
        .filter(item =>
          item.recordedAt &&
          !Number.isNaN(new Date(item.recordedAt).getTime())
        )
        .map(item => ({
          date: new Date(item.recordedAt),
          total: Number(item.price) + Number(item.shipping || 0),
          store: item.store
        }))
        .sort((a, b) => a.date - b.date);

      if (!records.length) return;

      if (records.length < 2) {
        const message = document.createElement("p");
        message.textContent =
          "Registre mais um preço deste produto para comparar a evolução.";
        graph.append(message);
      }

      const width = 700;
      const height = 300;
      const left = 75;
      const right = 25;
      const top = 25;
      const bottom = 65;
      const plotWidth = width - left - right;
      const plotHeight = height - top - bottom;

      const values = records.map(record => record.total);
      let min = Math.min(...values);
      let max = Math.max(...values);

      if (min === max) {
        min = Math.max(0, min - 5);
        max += 5;
      } else {
        const padding = (max - min) * 0.15;
        min = Math.max(0, min - padding);
        max += padding;
      }

      const x = index => records.length === 1
        ? left + plotWidth / 2
        : left + (index / (records.length - 1)) * plotWidth;

      const y = value =>
        top + ((max - value) / (max - min)) * plotHeight;

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");

      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", "100%");
      svg.setAttribute("role", "img");
      svg.setAttribute(
        "aria-label",
        `Evolução dos preços de ${group.name}`
      );

      function addLine(x1, y1, x2, y2, color = "#cccccc") {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", "1");
        svg.append(line);
      }

      // Linhas de referência e valores do eixo vertical
      for (let i = 0; i <= 4; i++) {
        const value = min + ((max - min) * i / 4);
        const position = y(value);

        addLine(left, position, width - right, position);

        const text = document.createElementNS(svgNS, "text");
        text.setAttribute("x", left - 8);
        text.setAttribute("y", position + 4);
        text.setAttribute("text-anchor", "end");
        text.setAttribute("font-size", "11");
        text.setAttribute("fill", "currentColor");
        text.textContent = money(value);
        svg.append(text);
      }

      addLine(left, top, left, height - bottom);
      addLine(left, height - bottom, width - right, height - bottom);

      // Linha que conecta os preços
      if (records.length > 1) {
        const polyline = document.createElementNS(svgNS, "polyline");

        polyline.setAttribute(
          "points",
          records.map((record, index) =>
            `${x(index)},${y(record.total)}`
          ).join(" ")
        );

        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", "#16834a");
        polyline.setAttribute("stroke-width", "3");
        polyline.setAttribute("stroke-linejoin", "round");

        svg.append(polyline);
      }

      records.forEach((record, index) => {
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", x(index));
        circle.setAttribute("cy", y(record.total));
        circle.setAttribute("r", "6");
        circle.setAttribute("fill", "#16834a");

        const tooltip = document.createElementNS(svgNS, "title");
        tooltip.textContent =
          `${record.date.toLocaleString("pt-BR")} — ` +
          `${record.store}: ${money(record.total)}`;

        circle.append(tooltip);
        svg.append(circle);

        const dateLabel = document.createElementNS(svgNS, "text");
        dateLabel.setAttribute("x", x(index));
        dateLabel.setAttribute("y", height - bottom + 20);
        dateLabel.setAttribute("text-anchor", "middle");
        dateLabel.setAttribute("font-size", "10");
        dateLabel.setAttribute("fill", "currentColor");
        dateLabel.textContent = record.date.toLocaleDateString("pt-BR");
        svg.append(dateLabel);
      });

      graph.append(svg);

      const first = records[0];
      const last = records[records.length - 1];

      const result = document.createElement("p");

      if (records.length > 1) {
        const difference = last.total - first.total;
        const direction = difference < 0
          ? "O preço diminuiu"
          : difference > 0
            ? "O preço aumentou"
            : "O preço permaneceu igual";

        result.textContent =
          `${direction} ${money(Math.abs(difference))} ` +
          `entre o primeiro e o último registro.`;
      } else {
        result.textContent = `Preço registrado: ${money(last.total)}.`;
      }

      graph.append(result);
    }

    select.addEventListener("change", drawSelectedProduct);
    drawSelectedProduct();
  }

  function render() {
    tbody.replaceChildren();

    const originalItems = readItems();

    const items = originalItems.map((item, index) => ({
      ...item,
      index,
      total: Number(item.price) + Number(item.shipping || 0)
    })).sort((a, b) => a.total - b.total);

    renderHistory(originalItems);
    renderChart(originalItems);

    if (!items.length) {
      summary.textContent = "Nenhum preço registrado ainda.";
      summary.className = "compare-summary empty";
      return;
    }

    const best = items[0].total;

    items.forEach(item => {
      const tr = document.createElement("tr");

      if (item.total === best) tr.className = "best-price";

      [
        item.product,
        item.store,
        money(item.price),
        money(item.shipping || 0),
        money(item.total)
      ].forEach((value, i) => {
        const td = document.createElement("td");
        td.textContent = value;

        if (i === 4 && item.total === best) {
          const tag = document.createElement("span");
          tag.className = "best-tag";
          tag.textContent = "Menor total";
          td.append(" ", tag);
        }

        tr.append(td);
      });

      const action = document.createElement("td");
      const del = document.createElement("button");

      del.type = "button";
      del.className = "remove";
      del.textContent = "Excluir";

      del.addEventListener("click", () => {
        const current = readItems();
        current.splice(item.index, 1);

        if (saveItems(current)) {
          showStatus("Preço removido do comparador e do histórico.");
        }
      });

      action.append(del);
      tr.append(action);
      tbody.append(tr);
    });

    summary.className = "compare-summary";
    summary.textContent =
      `Menor preço total: ${money(best)} — ${items[0].store} (${items[0].product}).`;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const product = $("compareProduct").value.trim();
    const store = $("compareStore").value.trim();
    const price = Number($("comparePrice").value);
    const shipping = Number($("compareShipping").value);

    if (
      !product ||
      !store ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(shipping) ||
      shipping < 0
    ) {
      showStatus("Preencha produto, loja, preço maior que zero e frete válido.", true);
      return;
    }

    const items = readItems();

    items.push({
      product,
      store,
      price,
      shipping,
      recordedAt: new Date().toISOString()
    });

    if (saveItems(items)) {
      form.reset();
      $("compareShipping").value = "0";
      showStatus("Preço adicionado e salvo no histórico!");
    }
  });

  const clear = $("clearCompare");

  if (clear) {
    clear.addEventListener("click", () => {
      if (
        readItems().length &&
        window.confirm("Deseja apagar todos os preços registrados e o histórico?")
      ) {
        if (saveItems([])) {
          showStatus("Comparação e histórico limpos.");
        }
      }
    });
  }

  render();
  showStatus("Comparador pronto para registrar preços, histórico e gráficos.");
})();
