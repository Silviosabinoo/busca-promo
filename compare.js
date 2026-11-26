(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("compareForm");
  const tbody = $("compareRows");
  const summary = $("compareSummary");
  const status = $("compareStatus");
  const KEY = "buscapromo_compare_v211";
  if (!form || !tbody || !summary) return;

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
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  function render() {
    tbody.replaceChildren();
    const items = readItems().map((item, index) => ({
      ...item, index, total: Number(item.price) + Number(item.shipping)
    })).sort((a, b) => a.total - b.total);

    if (!items.length) {
      summary.textContent = "Nenhum preço registrado ainda.";
      summary.className = "compare-summary empty";
      return;
    }
    const best = items[0].total;
    items.forEach(item => {
      const tr = document.createElement("tr");
      if (item.total === best) tr.className = "best-price";
      [item.product, item.store, money(item.price), money(item.shipping), money(item.total)].forEach((value, i) => {
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
        if (saveItems(current)) showStatus("Preço removido.");
      });
      action.append(del);
      tr.append(action);
      tbody.append(tr);
    });
    summary.className = "compare-summary";
    summary.textContent = `Menor preço total: ${money(best)} — ${items[0].store} (${items[0].product}).`;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const product = $("compareProduct").value.trim();
    const store = $("compareStore").value.trim();
    const price = Number($("comparePrice").value);
    const shipping = Number($("compareShipping").value);
    if (!product || !store || !Number.isFinite(price) || price <= 0 ||
        !Number.isFinite(shipping) || shipping < 0) {
      showStatus("Preencha produto, loja, preço maior que zero e frete válido.", true);
      return;
    }
    const items = readItems();
    items.push({ product, store, price, shipping });
    if (saveItems(items)) {
      form.reset();
      $("compareShipping").value = "0";
      showStatus("Preço adicionado e salvo neste navegador!");
    }
  });

  const clear = $("clearCompare");
  if (clear) clear.addEventListener("click", () => {
    if (readItems().length && window.confirm("Deseja apagar todos os preços registrados?")) {
      if (saveItems([])) showStatus("Comparação limpa.");
    }
  });
  render();
  showStatus("Comparador pronto para registrar preços.");
})();