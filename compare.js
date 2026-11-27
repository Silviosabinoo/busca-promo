
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = $("compareForm");
  const tbody = $("compareRows");
  const summary = $("compareSummary");
  const status = $("compareStatus");
  const KEY = "buscapromo_compare_v211";

  if (!form || !tbody || !summary) return;

  // Área do histórico de preços
  let history = $("compareHistory");

  if (!history) {
    history = document.createElement("section");
    history.id = "compareHistory";
    history.className = "compare-history";
    summary.insertAdjacentElement("afterend", history);
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

    const groups = new Map();

    items.forEach(item => {
      const product = String(item.product || "Produto sem nome");
      const key = product.trim().toLocaleLowerCase("pt-BR");

      if (!groups.has(key)) {
        groups.set(key, { name: product, records: [] });
      }

      groups.get(key).records.push(item);
    });

    groups.forEach(group => {
      const details = document.createElement("details");
      details.className = "history-product";

      const title = document.createElement("summary");
      title.textContent = `${group.name} — ${group.records.length} registro(s)`;
      details.append(title);

      const list = document.createElement("ul");

      group.records.sort((a, b) => {
        return new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0);
      });

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

  function render() {
    tbody.replaceChildren();

    const originalItems = readItems();

    const items = originalItems.map((item, index) => ({
      ...item,
      index,
      total: Number(item.price) + Number(item.shipping || 0)
    })).sort((a, b) => a.total - b.total);

    renderHistory(originalItems);

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
  showStatus("Comparador pronto para registrar preços e histórico.");
})();

