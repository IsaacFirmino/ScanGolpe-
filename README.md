# 🛡️ ScanGolpe — Threat Intelligence & Detecção de Fraudes Digitais

O **ScanGolpe** é uma plataforma avançada de prevenção contra fraudes digitais, focada em identificar e neutralizar ameaças cibernéticas no cenário brasileiro. Através de um mecanismo de verificação em tempo real, o sistema analisa domínios maliciosos, esquemas de phishing, chaves Pix fraudulentas e mensagens de engenharia social, fornecendo um diagnóstico técnico e analítico instantâneo.

---

## 🚀 Arquitetura de Detecção

O sistema é equipado com algoritmos focados na análise de padrões maliciosos, classificados em múltiplas frentes de atuação:

- 💬 **Engenharia Social (Mensagens):** Detecção de esquemas de manipulação, clonagem de contas (ex: WhatsApp) e falsas centrais de atendimento.
- 🔗 **Phishing e Typosquatting (Links):** Validação estrutural de URLs e cruzamento de dados com marcas reais utilizando algoritmos de proximidade (Distância de Levenshtein) para identificar domínios fraudulentos.
- 💸 **Fraudes Financeiras (Pix/Dados):** Inspeção de chaves de transferência, QR Codes e boletos adulterados.
- 📢 **Anúncios Maliciosos:** Mapeamento de gatilhos mentais coercitivos, falsas escassezes e promoções irreais.

---

## 🛠️ Tecnologias e Estrutura do Projeto

A aplicação adota uma arquitetura modular baseada em tecnologias front-end modernas, priorizando performance, manutenibilidade e segurança na detecção (client-side):

- **HTML5:** Estrutura semântica (`index.html`) e acessível da interface de análise.
- **CSS3 Modular (`styles.css`):**
  - Tipografia técnica (`JetBrains Mono` para dados analíticos, `Inter` para legibilidade).
  - Identidade visual sob paleta sóbria (Deep Space Black & Neon Cyan), refletindo um ambiente corporativo de cibersegurança.
  - Animações de varredura (Scanline) e efeitos visuais avançados (`backdrop-filter`) para uma experiência de diagnóstico realista.
- **JavaScript (Vanilla JS):**
  - **`app.js`**: Core lógico da aplicação, responsável pelo roteamento das validações, parsing de URLs, cálculo algorítmico de Levenshtein e renderização dinâmica dos relatórios de ameaça.
  - **`brands.json`**: Base de dados externa de marcas monitoradas, permitindo escalabilidade e atualização fácil das assinaturas de detecção de phishing sem alteração no código fonte.

---

## 🎨 Identidade Visual e UI/UX

O design foi concebido sob princípios de interfaces de ferramentas de _Threat Intelligence_ (Inteligência de Ameaças):

- **Linguagem de Relatório:** Os resultados das análises são apresentados com precisão técnica (nível de risco, tipo de ameaça, recomendações táticas).
- **Feedback Visual:** Uso de scanlines radiais, conectores e marcadores de status (🔴 Crítico, 🟡 Alerta, 🟢 Seguro) para comunicação universal e instantânea do nível de ameaça.

---

## 🔧 Como Executar o Ambiente de Desenvolvimento

O projeto foi refatorado para uma estrutura modular. Devido à integração com o arquivo `brands.json`, a execução exige um servidor web local.

1. Clone o repositório para o seu ambiente local:
   ```bash
   git clone https://github.com/IsaacFirmino/ScanGolpe-.git
   ```
2. Acesse o diretório do projeto:
   ```bash
   cd ScanGolpe-
   ```
3. Inicie um servidor web local. Recomendamos o uso da extensão **Live Server** no VS Code ou o módulo nativo do Python:
   ```bash
   python -m http.server 8000
   ```
4. Acesse a aplicação através do navegador no endereço [https://isaacfirmino.github.io/ScanGolpe-](https://isaacfirmino.github.io/ScanGolpe-).

---

## 👥 Pesquisadores e Desenvolvedores

- Isabelle Firmino
- Isaac Firmino
