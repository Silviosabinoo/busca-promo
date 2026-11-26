const stores = [
  {id:"google",name:"Google Shopping",url:q=>`https://www.google.com/search?tbm=shop&q=${q}`},
  {id:"mercadolivre",name:"Mercado Livre",url:q=>`https://lista.mercadolivre.com.br/${q}`},
  {id:"amazon",name:"Amazon Brasil",url:q=>`https://www.amazon.com.br/s?k=${q}`},
  {id:"shopee",name:"Shopee",url:q=>`https://shopee.com.br/search?keyword=${q}`},
  {id:"magalu",name:"Magazine Luiza",url:q=>`https://www.magazineluiza.com.br/busca/${q}/`},
  {id:"kabum",name:"KaBuM!",url:q=>`https://www.kabum.com.br/busca/${q}`},
  {id:"aliexpress",name:"AliExpress",url:q=>`https://pt.aliexpress.com/w/wholesale-${q}.html`},
  {id:"casasbahia",name:"Casas Bahia",url:q=>`https://www.casasbahia.com.br/${q}/b`},
  {id:"carrefour",name:"Carrefour",url:q=>`https://www.google.com/search?q=site%3Acarrefour.com.br+${q}`}
];
const $ = id => document.getElementById(id);
const choices = $("storeChoices");
stores.forEach((s,i)=>{
  const label=document.createElement("label"); label.className="store-option";
  const input=document.createElement("input"); input.type="checkbox"; input.value=s.id; input.checked=true;
  label.append(input,document.createTextNode(s.name)); choices.append(label);
});
$("selectAll").addEventListener("click",()=>choices.querySelectorAll("input").forEach(c=>c.checked=true));


async function searchMercadoLivre(product) {
  const status = $("mlStatus");
  const root = $("mlResults");
  root.replaceChildren();
  status.className = "note";
  status.textContent = "Consultando anúncios do Mercado Livre...";
  const endpoint = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(product)}&sort=price_asc&limit=20`;
  try {
    const response = await fetch(endpoint, { headers: { "Accept": "application/json" } });
    if (!response.ok) throw new Error(`A API respondeu com status ${response.status}.`);
    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    if (!results.length) {
      status.textContent = "A busca foi concluída, mas não retornou anúncios para esse termo.";
      return;
    }
    results.forEach(item => {
      const card = document.createElement("article");
      card.className = "ml-result";
      if (item.thumbnail) {
        const img = document.createElement("img");
        img.src = item.thumbnail.replace(/^http:/, "https:");
        img.alt = "";
        img.loading = "lazy";
        card.append(img);
      }
      const info = document.createElement("div");
      info.className = "ml-info";
      const title = document.createElement("a");
      title.href = item.permalink;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
      title.textContent = item.title || "Anúncio do Mercado Livre";
      const price = document.createElement("strong");
      price.textContent = Number(item.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const details = document.createElement("small");
      const shipping = item.shipping && item.shipping.free_shipping ? "Frete grátis informado" : "Frete a consultar";
      const seller = item.seller && item.seller.nickname ? `Vendedor: ${item.seller.nickname}` : "Vendedor no anúncio";
      details.textContent = `${seller} · ${shipping}`;
      info.append(title, price, details);
      card.append(info);
      root.append(card);
    });
    status.textContent = `Encontrados ${results.length} anúncios. Ordenados pelo preço anunciado, do menor para o maior. O frete pode alterar a ordem do custo final.`;
  } catch (error) {
    status.className = "note error";
    status.textContent = "Não foi possível consultar a API diretamente pelo navegador. Isso pode ocorrer por exigência de autenticação, bloqueio de acesso ou CORS. Os links de pesquisa das lojas continuam disponíveis. Detalhe: " + error.message;
  }
}

$("searchForm").addEventListener("submit",e=>{
  e.preventDefault();
  const product=$("product").value.trim();
  if(!product)return;
  const query=[product,$("sortHint").value,$("maxPrice").value?`até R$ ${$("maxPrice").value}`:""].filter(Boolean).join(" ");
  const encoded=encodeURIComponent(query).replace(/%20/g,"+");
  const selected=stores.filter(s=>choices.querySelector(`input[value="${s.id}"]`).checked);
  if(!selected.length){alert("Selecione pelo menos uma loja.");return;}
  const list=$("resultLinks");list.replaceChildren();
  selected.forEach(s=>{
    const a=document.createElement("a");a.className="result-link";a.href=s.url(encoded);a.target="_blank";a.rel="noopener";
    const name=document.createElement("span");name.textContent=s.name;
    const hint=document.createElement("small");hint.textContent="Abrir pesquisa ↗";
    a.append(name,hint);list.append(a);
  });
  $("resultSummary").textContent=`Pesquisas preparadas para “${product}”. A busca automática no Mercado Livre será tentada abaixo.`;
  searchMercadoLivre(product);
  $("resultsPanel").hidden=false;
  $("resultsPanel").scrollIntoView({behavior:"smooth",block:"start"});
});

const KEY="buscapromo_watch_v2";
function readWatch(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function saveWatch(items){localStorage.setItem(KEY,JSON.stringify(items));renderWatch()}
function renderWatch(){
  const root=$("watchList");root.replaceChildren();const items=readWatch();
  if(!items.length){root.innerHTML='<p class="muted">Nenhum produto cadastrado ainda.</p>';return}
  items.forEach((item,index)=>{
    const row=document.createElement("div");row.className="watch-item";
    const info=document.createElement("div");const strong=document.createElement("strong");strong.textContent=item.name;
    const small=document.createElement("small");small.textContent=`Preço desejado: ${Number(item.price).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`;
    info.append(strong,small);
    const del=document.createElement("button");del.className="remove";del.textContent="Remover";del.addEventListener("click",()=>{const a=readWatch();a.splice(index,1);saveWatch(a)});
    row.append(info,del);root.append(row);
  });
}
$("watchForm").addEventListener("submit",e=>{
  e.preventDefault();const name=$("watchName").value.trim(),price=Number($("watchPrice").value);
  if(!name||!Number.isFinite(price)||price<=0)return;
  const items=readWatch();items.push({name,price});saveWatch(items);e.target.reset();
});
renderWatch();

$("notifyBtn").addEventListener("click",async()=>{
  if(!("Notification" in window)){alert("Este navegador não oferece suporte a notificações.");return}
  const permission=await Notification.requestPermission();
  if(permission==="granted"){
    new Notification("Busca Promo",{body:"Notificações ativadas neste dispositivo."});
    $("notifyBtn").textContent="Notificações ativadas";
  }else alert("A permissão não foi concedida. Você pode alterá-la nas configurações do navegador.");
});
if("serviceWorker" in navigator && location.protocol.startsWith("http")) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
