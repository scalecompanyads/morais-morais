// LP de Captação (Craveiro Vilela & Morais · Morais e Morais Consultoria Especializada)
// Gera index.html (página completa, com GTM) e elementor-embed.html (widget HTML, CSS escopado).
// Uso: node build.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;

// ---------- Configuração ----------
const CFG = {
  WA_URL: 'https://wa.me/5535991230717?text=' + encodeURIComponent('Olá! Vim pelo site e gostaria de falar com um advogado sobre a minha situação no trabalho.'),
  // Pasta das imagens. Para o Elementor, troque pela URL de uploads do WordPress (ex.: https://dominio/wp-content/uploads/2026/10)
  ASSETS: 'assets',
};

const FAQ = [
  ['Se eu sair da empresa, vou perder meus direitos?', 'Depende de como você sai. Pedir demissão e ter a rescisão indireta reconhecida têm efeitos bem diferentes: na rescisão indireta, os efeitos são semelhantes aos de uma dispensa sem justa causa. Por isso, não tome essa decisão sem antes entender o seu caso.'],
  ['Tenho receio de questionar a empresa. Ela vai saber que procurei um advogado?', 'Não. A conversa é protegida por sigilo profissional. A empresa só toma conhecimento se houver uma medida judicial ou extrajudicial, e isso só acontece com a sua autorização.'],
  ['Como saber se o meu caso permite rescisão indireta?', 'É exatamente isso que a análise responde. O escritório avalia as irregularidades, os documentos e as provas disponíveis, como FGTS não depositado ou desvio de função, antes de indicar qualquer caminho.'],
  ['Como saber se a minha atividade dá direito a insalubridade ou periculosidade?', 'Depende do ambiente e das condições do seu trabalho. Conte o que você faz no dia a dia e a que está exposto. Em regra, o direito é confirmado por perícia técnica, e o advogado orienta sobre a possibilidade e os próximos passos.'],
  ['Ainda estou trabalhando. Posso buscar orientação?', 'Sim, e é o melhor momento. A orientação prévia mostra como agir enquanto o contrato está ativo, evitando atitudes que possam prejudicar seus direitos.'],
  ['Como saber se o meu FGTS está sendo depositado?', 'Pelo aplicativo do FGTS ou pelo extrato da Caixa. Se faltam meses ou o saldo não aparece, guarde o extrato: ele é um dos documentos mais importantes para a análise.'],
  ['Posso ser demitido ou perseguido por buscar meus direitos?', 'Buscar direitos é uma garantia de todo trabalhador. Se houver retaliação, como perseguição ou tratamento diferente, essa conduta também pode ser levada à Justiça. O advogado orienta como agir para se proteger.'],
  ['Não moro em Três Corações. Vocês atendem a minha cidade?', 'Sim. O escritório atende trabalhadores de Três Corações e das cidades do Sul de Minas Gerais, e o primeiro contato é feito direto pelo WhatsApp.'],
  ['Até quando posso cobrar os meus direitos?', 'O prazo é de até 2 anos após o fim do contrato, e podem ser cobrados os direitos dos últimos 5 anos. Por isso, quanto antes o caso for analisado, melhor.'],
];

// ---------- Monta a página ----------
let page = fs.readFileSync(path.join(dir, 'src.html'), 'utf8');

page = page.replace('<!--FAQ-->', FAQ.map(([q, a], i) => `        <details class="faq-item rv"${i === 0 ? ' open' : ''}>
          <summary><span>${q}</span><span class="faq-plus"><svg aria-hidden="true"><use href="#ic-plus-bold"/></svg></span></summary>
          <div class="faq-a"><p>${a}</p></div>
        </details>`).join('\n'));

const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
page = page.replace('<!--FAQ_LD-->', `    <script type="application/ld+json">${JSON.stringify(ld)}</script>`);

// Ícones usados viram <symbol>
const used = [...new Set([...page.matchAll(/#ic-([a-z-]+)/g)].map(m => m[1]))];
const symbols = used.map(n => {
  const svg = fs.readFileSync(path.join(dir, 'icons', n + '.svg'), 'utf8');
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `    <symbol id="ic-${n}" viewBox="0 0 256 256"><g fill="currentColor">${inner}</g></symbol>`;
}).join('\n');
page = page.replace('<!--ICONS-->', symbols);

for (const [k, v] of Object.entries(CFG)) page = page.split(`{{${k}}}`).join(v);
if (/\{\{[A-Z_]+\}\}/.test(page)) throw new Error('placeholder sem valor: ' + page.match(/\{\{[A-Z_]+\}\}/)[0]);

fs.writeFileSync(path.join(dir, 'index.html'), page);

// ---------- Embed para o Elementor ----------
const ROOT = '#cvm-lp';
const headLinks = page.match(/<link rel="preconnect"[\s\S]*?<\/noscript>/)[0];
const css = page.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
const body = page.match(/<\/noscript>\s*<!-- End Google Tag Manager \(noscript\) -->([\s\S]*?)<script id="lp-js">/)[1];
const js = page.match(/<script id="lp-js">([\s\S]*?)<\/script>/)[1];

function scopeSelector(sel) {
  sel = sel.trim();
  if (sel === ':root' || sel === 'body') return ROOT;
  if (sel === 'html') return 'html';
  if (sel === '*') return `${ROOT}, ${ROOT} *`;
  return `${ROOT} ${sel}`;
}
function scopeCss(input) {
  let out = '', i = 0;
  while (i < input.length) {
    const open = input.indexOf('{', i);
    if (open === -1) { out += input.slice(i); break; }
    const head = input.slice(i, open);
    let depth = 1, j = open + 1;
    while (depth && j < input.length) { if (input[j] === '{') depth++; else if (input[j] === '}') depth--; j++; }
    const inner = input.slice(open + 1, j - 1);
    const lead = head.match(/^\s*/)[0];
    const h = head.trim();
    if (h.startsWith('@media') || h.startsWith('@supports')) out += `${lead}${h} {${scopeCss(inner)}}`;
    else if (h.startsWith('@')) out += `${lead}${h} {${inner}}`;
    else out += `${lead}${h.split(',').map(scopeSelector).join(', ')} {${inner}}`;
    i = j;
  }
  return out;
}

const scoped = scopeCss(css) + `
  ${ROOT} { position: relative; width: 100vw; max-width: 100vw; margin-left: calc(50% - 50vw); overflow-x: hidden; }
  ${ROOT} h1, ${ROOT} h2, ${ROOT} h3, ${ROOT} h4 { color: inherit; text-transform: none; }
  ${ROOT} .ed-title, ${ROOT} .sit-title, ${ROOT} .cmp-title { text-transform: uppercase; }
  ${ROOT} a:hover, ${ROOT} a:focus { text-decoration: none; }
  ${ROOT} ul, ${ROOT} li { margin: 0; }
  ${ROOT} section { margin: 0; }
  ${ROOT} iframe { max-width: none; }
`;

const html = body.replace('<main id="topo">', '<div id="topo">').replace('</main>', '</div>').trim();
const scopedJs = js
  .replace(/document\.querySelectorAll\(/g, 'root.querySelectorAll(')
  .replace("document.getElementById('waFloat')", "root.querySelector('#waFloat')");

// GTM no embed, com trava: só carrega se o container ainda não estiver na página (evita contagem dupla)
const GTM_ID = 'GTM-KX4WMSRX';
const gtm = `<!-- Google Tag Manager (só carrega se o site ainda não tiver este container) -->
<script>(function(w,d,s,l,i){if(w.google_tag_manager&&w.google_tag_manager[i])return;
if(d.querySelector('script[src*="googletagmanager.com/gtm.js?id='+i+'"]'))return;
w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager -->`;

const embed = `<!--
  Craveiro Vilela & Morais · LP de Captação (Trabalhista) · widget HTML do Elementor
  Página: modelo "Elementor Canvas", 1 seção full width sem padding, 1 widget HTML com este código.
  GTM (${GTM_ID}) incluído com trava contra duplicidade. Cliques no WhatsApp disparam "whatsapp_click" no dataLayer.
-->
${gtm}
${headLinks}
<style>
${scoped}
</style>

<div id="cvm-lp">
${html}
</div>

<script>
(function () {
  const root = document.getElementById('cvm-lp');
  if (!root) return;
${scopedJs.replace(/^/gm, '  ').trimEnd()}
})();
</script>
`;
fs.writeFileSync(path.join(dir, 'elementor-embed.html'), embed);
console.log(`index.html ${(page.length / 1024).toFixed(1)} KB · elementor-embed.html ${(embed.length / 1024).toFixed(1)} KB · ícones: ${used.length}`);
