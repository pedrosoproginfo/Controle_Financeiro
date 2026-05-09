let editando = -1;
let dados = JSON.parse(localStorage.getItem("dados")) || [];
let reserva = 0;
let chart;
let filtroStatus = null;


// ✅ Corrigir datas antigas
function corrigirData(data){
 if(!data) return "";

 if(data.includes("-")) return data;

 if(data.includes("/")){
  let p = data.split("/");
  return `${p[2]}-${p[0].padStart(2,'0')}-${p[1].padStart(2,'0')}`;
 }

 return data;
}

dados = dados.map(it => ({ ...it, mes: corrigirData(it.mes) }));

// ELEMENTOS
const descricao = document.getElementById("descricao");
const valorInput = document.getElementById("valor");
const tipoInput = document.getElementById("tipo");
const statusInput = document.getElementById("status");
const mes = document.getElementById("mes");
const lista = document.getElementById("lista");
const filtroMes = document.getElementById("filtroMes");
const btnAdd = document.getElementById("btnAdd");

// FORMATOS
function formatarMoeda(v){
 return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
}

function formatarData(data){
 if(!data) return "";
 let [ano, mes, dia] = data.split("-");
 return `${dia}/${mes}/${ano}`;
}

// MÁSCARA VALOR
valorInput.addEventListener("input", (e)=>{
 let v = e.target.value.replace(/\D/g,'');
 if(!v) return e.target.value = "";

 v = (parseInt(v)/100).toFixed(2);
 v = v.replace(".", ",");
 v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

 e.target.value = "R$ " + v;
});

// STATUS
function ajustarStatus(){
 if(tipoInput.value === "receita"){
  statusInput.innerHTML = `
   <option value="pago">Recebido</option>
   <option value="pendente">A receber</option>
  `;
 }else{
  statusInput.innerHTML = `
   <option value="pago">Pago</option>
   <option value="pendente">A pagar</option>
  `;
 }
}

// ADICIONAR
let categoriaSelecionada = "Outros";

function adicionar(){
 let valor = parseFloat(valorInput.value.replace(/\D/g,'')) / 100;
 if(!descricao.value || isNaN(valor)) return;

 let item = {
  desc: descricao.value,
  valor,
  categoria: categoriaSelecionada,
  tipo: tipoInput.value,
  status: statusInput.value,
  mes: mes.value
 };

 if(editando >= 0){
  dados[editando] = item;
  editando = -1;
  btnAdd.innerText = "Adicionar";
 } else {
  dados.push(item);
 }

 salvar();
 atualizar();

 descricao.value="";
 valorInput.value="";
}

// ATUALIZAR (com SALDOS + GRÁFICO)
function atualizar(){
 let filtro = filtroMes.value;

 let total=0, real=0, pagar=0, receber=0;
 let rec=0, desp=0;

 lista.innerHTML="";

 dados.forEach((it,i)=>{

  // filtro por mês
  if(filtro){
   if(it.mes.slice(0,7) !== filtro.slice(0,7)) return;
  }
  // filtro por status clicado nos cards
if(filtroStatus === 'pagar'){
  if(!(it.tipo === 'despesa' && it.status === 'pendente')) return;
}

if(filtroStatus === 'receber'){
  if(!(it.tipo === 'receita' && it.status === 'pendente')) return;
}

  if(it.tipo==="receita"){
   total+=it.valor;
   rec+=it.valor;
   if(it.status==="pendente") receber+=it.valor;
   else real+=it.valor;
  } else {
   total-=it.valor;
   desp+=it.valor;
   if(it.status==="pendente") pagar+=it.valor;
   else real-=it.valor;
  }

  lista.innerHTML += `
  
  <tr class="${it.status === 'pendente' && it.tipo === 'despesa' ? 'linha-apagar' : ''}">
    <td>${it.desc}</td>
    <td>${formatarMoeda(it.valor)}</td>
    <td>${it.tipo}</td>
    <td>${it.categoria}</td>
    
    <td>${formatarStatus(it)}</td>
    <td>${formatarData(it.mes)}</td>
    <td>

<button onclick="editar(${i})">✏️ Editar</button>
<button onclick="excluir(${i})">🗑️ Excluir</button>
<button onclick="copiar(${i})">📋 Copiar</button>
<button onclick="status(${i})">🔄 Alterar Status</button>

    </td>
  </tr>`;
 });

 document.getElementById("saldo").innerText = formatarMoeda(total);
 document.getElementById("saldoReal").innerText = formatarMoeda(real);
 document.getElementById("subsaldo").innerText = formatarMoeda(pagar);
 document.getElementById("subreceber").innerText = formatarMoeda(receber);

 grafico(rec, desp, receber, pagar);
}

// GRÁFICO
function grafico(rec, desp, receber, pagar){
 if(chart) chart.destroy();

 chart = new Chart(document.getElementById("grafico"), {
  type:'bar',
  data:{
   labels:["Receitas","Despesas","A receber","A pagar"],
   datasets:[{
    data:[rec,desp,receber,pagar],
    backgroundColor:["green","red","blue","orange"]
   }]
  }
 });
}

// EDITAR / EXCLUIR
function editar(i){
 let it = dados[i];

 descricao.value = it.desc;
 valorInput.value = formatarMoeda(it.valor);
 tipoInput.value = it.tipo;
 statusInput.value = it.status;
 mes.value = it.mes;

 categoriaSelecionada = it.categoria;

 editando = i;
 btnAdd.innerText = "Salvar edição";

}
function filtrarStatus(tipo){
  filtroStatus = tipo;
  atualizar();
}
function formatarStatus(it){
  if(it.tipo === "receita"){
    return it.status === "pago" ? "Recebido" : "A receber";
  } else {
    return it.status === "pago" ? "Pago" : "A pagar";
  }
}


function excluir(i){
 dados.splice(i,1);
 salvar();
 atualizar();
}

function copiar(i){
  let it = dados[i];

  // Preenche os campos
  descricao.value = it.desc;
  valorInput.value = formatarMoeda(it.valor);
  tipoInput.value = it.tipo;

  // Atualiza o select de status (importante)
  ajustarStatus();
  statusInput.value = it.status;

  mes.value = it.mes;

  // Categoria
  categoriaSelecionada = it.categoria;

  // Atualiza botão visual ativo da categoria
  document.querySelectorAll(".categorias button")
    .forEach(b => {
      b.classList.remove("ativo");
      if(b.innerText.includes(it.categoria)){
        b.classList.add("ativo");
      }
      descricao.focus();
    });
}

// CATEGORIA
function selecionarCategoria(btn, cat){
 categoriaSelecionada = cat;

 document.querySelectorAll(".categorias button")
  .forEach(b=>b.classList.remove("ativo"));

 btn.classList.add("ativo");
}
// EVENTOS
mes.addEventListener("input", () => {
 // não precisa mais fazer nada aqui
});
function limparFiltros() {
  filtroMes.value = "";
  filtroStatus = null;
  atualizar();
}
filtroMes.addEventListener("input", () => {
 atualizar();
});

function trocarFundoSuave() {

  let bgAtivo = document.getElementById(`bg${ativo}`);
  let bgProximo = document.getElementById(`bg${ativo === 1 ? 2 : 1}`);

  index++;
  if (index >= imagensFundo.length) index = 0;

  let novaImagem = imagensFundo[index];

  // PRECARREGA IMAGEM
  let img = new Image();
  img.src = novaImagem;

  img.onload = () => {

    bgProximo.style.backgroundImage = `
      linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)),
      url('${novaImagem}')
    `;

    bgProximo.style.opacity = 1;
    bgAtivo.style.opacity = 0;

    ativo = ativo === 1 ? 2 : 1;
  };
}

const imagensFundo = [
  "imagens/demonst.webp",
"imagens/foco.webp",
"imagens/mercado.webp",
"imagens/Porkinho.webp",
"imagens/reuniao.jpg"
];

let index = 0;
let ativo = 1;

function trocarFundoSuave() {

  let bgAtivo = document.getElementById(`bg${ativo}`);
  let bgProximo = document.getElementById(`bg${ativo === 1 ? 2 : 1}`);

  index++;
  if (index >= imagensFundo.length) index = 0;

  bgProximo.style.backgroundImage = `
    linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)),
    url('${imagensFundo[index]}')
  `;

  // faz o fade
  bgProximo.style.opacity = 1;
  bgAtivo.style.opacity = 0;

  // troca camada ativa
  ativo = ativo === 1 ? 2 : 1;
}

// imagem inicial
document.getElementById("bg1").style.backgroundImage = `
  linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)),
  url('${imagensFundo[0]}')
`;

// troca a cada 6 segundos
setInterval(trocarFundoSuave, 7000);


// REGISTRAR SERVICE WORKER
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js')
      .then(function (registration) {
        console.log('Service Worker registrado ✅', registration);
      })
      .catch(function (error) {
        console.log('Erro ao registrar Service Worker ❌', error);
      });
  });
}




window.onload = ()=>{
 let hoje = new Date();

 let d = hoje.getDate().toString().padStart(2,'0');
 let m = (hoje.getMonth()+1).toString().padStart(2,'0');
 let a = hoje.getFullYear();

 let data = `${a}-${m}-${d}`;

 mes.value = data;
filtroMes.value = data.slice(0,7);

 ajustarStatus();
 atualizar();
};
// SALVAR
function salvar(){
 localStorage.setItem("dados", JSON.stringify(dados));
}

let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  console.log("✅ PWA pronto para instalar");

  const btn = document.createElement("button");
  btn.innerText = "📲 Instalar App";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.padding = "12px 16px";
  btn.style.background = "#667eea";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "10px";
  btn.style.fontWeight = "bold";
  btn.style.zIndex = "999";

  btn.onclick = async () => {
    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      console.log("Usuário instalou ✅");
      btn.remove();
    }

    deferredPrompt = null;
  };

  document.body.appendChild(btn);
});
