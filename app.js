const stores = [
  {id:"google",name:"Google Shopping",url:q=>`https://www.google.com/search?tbm=shop&q=${q}`},
  {id:"mercadolivre",name:"Mercado Livre",url:q=>`https://lista.mercadolivre.com.br/${q.replace(/%20/g,"-")}`},
  {id:"amazon",name:"Amazon Brasil",url:q=>`https://www.amazon.com.br/s?k=${q}`},
  {id:"shopee",name:"Shopee",url:q=>`https://shopee.com.br/search?keyword=${q}`},
  {id:"magalu",name:"Magazine Luiza",url:q=>`https://www.magazineluiza.com.br/busca/${q}/`},
  {id:"kabum",name:"KaBuM!",url:q=>`https://www.kabum.com.br/busca/${q}`},
  {id:"aliexpress",name:"AliExpress",url:q=>`https://pt.aliexpress.com/w/wholesale-${q}.html`},
  {id:"casasbahia",name:"Casas Bahia",url:q=>`https://www.casasbahia.com.br/${q}/b`},
  {id:"carrefour",name:"Carrefour",url:q=>`https://www.carrefour.com.br/busca/${q}`}
];
const $ = s => document.querySelector(s);
const toast = msg => { const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600); };
let selected = new Set(stores.map(s=>s.id));
function renderStores(){
  $("#storeGrid").innerHTML=stores.map(s=>`<label class="store-option ${selected.has(s.id)?"active":""}"><input type="checkbox" data-store="${s.id}" ${selected.has(s.id)?"checked":""}>${s.name}</label>`).join("");
  $("#storeGrid").querySelectorAll("input").forEach(input=>input.addEventListener("change",e=>{e.target.checked?selected.add(e.target.dataset.store):selected.delete(e.target.dataset.store);renderStores()}));
}
renderStores();
$("#toggleStores").addEventListener("click",()=>{selected=selected.size===stores.length?new Set():new Set(stores.map(s=>s.id));renderStores();});
$("#searchForm").addEventListener("submit",e=>{
  e.preventDefault();
  const term=$("#productQuery").value.trim(); if(!term)return;
  if(!selected.size){toast("Selecione pelo menos uma loja.");return;}
  const max=$("#maxPrice").value.trim();
  const query=encodeURIComponent(term+(max?` até R$ ${max}`:""));
  const chosen=stores.filter(s=>selected.has(s.id));
  chosen.forEach((s,i)=>setTimeout(()=>window.open(s.url(query),"_blank","noopener"),i*180));
  $("#searchFeedback").textContent=`Abrindo ${chosen.length} pesquisa(s) para “${term}”. Confira os preços e condições diretamente nas lojas.`;
});
const STORAGE_KEY="buscapromo.watch.v1";
function getItems(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return []}}
function saveItems(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items));renderWatch()}
function money(v){return Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function renderWatch(){
  const items=getItems(), list=$("#watchList");
  if(!items.length){list.innerHTML='<div class="empty-state">Sua lista está vazia. Adicione um produto e o preço que deseja pagar.</div>';return;}
  list.innerHTML=items.map(item=>`<div class="watch-item"><div><strong>${escapeHtml(item.name)}</strong><small>Preço desejado: ${money(item.price)} · Adicionado em ${new Date(item.created).toLocaleDateString("pt-BR")}</small></div><button class="delete-btn" data-delete="${item.id}" aria-label="Remover ${escapeHtml(item.name)}">Remover</button></div>`).join("");
  list.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>saveItems(getItems().filter(x=>x.id!==b.dataset.delete))));
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("#watchForm").addEventListener("submit",e=>{
  e.preventDefault();const name=$("#watchName").value.trim(),price=Number($("#watchPrice").value);
  if(!name||!price||price<0){toast("Informe o produto e um preço válido.");return;}
  const items=getItems();items.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,price,created:Date.now()});saveItems(items);e.target.reset();toast("Produto adicionado à sua lista.");
});
renderWatch();
$("#notifyBtn").addEventListener("click",async()=>{
  if(!("Notification" in window)){toast("Este navegador não oferece notificações.");return;}
  const permission=await Notification.requestPermission();
  if(permission==="granted"){toast("Notificações ativadas neste dispositivo.");if(getItems().length)new Notification("Busca Promo",{body:`Você acompanha ${getItems().length} produto(s). Abra o app para consultar os preços.`});}
  else toast("Permissão de notificação não concedida.");
});
let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false;});
$("#installBtn").addEventListener("click",async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").hidden=true;});
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
