# 🛡️ ScanGolpe — Antes de confiar, escaneie.

O **ScanGolpe** é uma landing page moderna e interativa que funciona como o primeiro detector inteligente contra golpes digitais focado no cenário brasileiro. O projeto combina uma interface de usuário elegante de alta fidelidade (estilo *Glassmorphism*) com um scanner em tempo real que utiliza Inteligência Artificial para analisar o risco de mensagens, links, chaves Pix e anúncios suspeitos.

---

## 🚀 Funcionalidades Principais

* **Scanner Inteligente Multicategoria:** Abas dedicadas para analisar diferentes tipos de conteúdos suspeitos:
    * 💬 **Mensagens:** Focado em tentativas de clonagem de WhatsApp, SMS falsos e engenharia social.
    * 🔗 **Links / URLs:** Identifica páginas falsas (phishing) e redirecionamentos maliciosos.
    * 💸 **Pix / Dados:** Avalia chaves Pix, boletos adulterados e dados bancários suspeitos.
    * 📢 **Anúncios:** Detecta falsas promoções com preços irreais e senso de urgência forçado.
* **Análise em Tempo Real:** Retorna instantaneamente um nível de risco categorizado por cores (🟢 Baixo, 🟡 Suspeito, 🔴 Possível Golpe).
* **Interface Glassmorphism Dinâmica:** Efeitos visuais modernos com orbes de luz animados no fundo, blur responsivo e paleta de cores escuras de alta tecnologia.
* **Modo Idosos Integrado:** Menção na arquitetura para acessibilidade facilitada.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído de forma minimalista e eficiente utilizando apenas tecnologias nativas da web (Single File Application):

* **HTML5:** Estruturação semântica da página e das seções de conversão.
* **CSS3 moderno:** * Variáveis CSS para gerenciamento de temas.
    * Animações personalizadas (`@keyframes`) para os efeitos de pulso dos orbes de fundo.
    * Layout responsivo estruturado com **Flexbox** e **CSS Grid**.
    * Design baseado em filtros de desfoque (`backdrop-filter`) para efeito de vidro.
* **JavaScript (Vanilla JS):**
    * Gerenciamento dinâmico de estado das abas do scanner.
    * Manipulação assíncrona do DOM para exibição dos estados de carregamento e renderização dos cartões de risco.
    * Integração direta com a API da Anthropic usando o modelo `claude-sonnet` via requisições HTTP (`fetch`).

---

## 🎨 Design e Identidade Visual

A interface adota um tom corporativo de cibersegurança misturado com a modernidade das ferramentas de IA:
* **Tipografia:** `Syne` para títulos marcantes e geométricos; `DM Sans` para textos de leitura fluida.
* **Cores Principais:** Tons profundos de azul (`#0A1628` ao `#2979FF`) contrastados com cores semânticas de alerta de risco (Verde, Amarelo e Vermelho).
* **Filtro de Ruído:** Um padrão sutil de ruído em SVG é aplicado sobre o fundo para dar uma textura premium ao layout.

---

## 🔧 Como Executar o Projeto

Como o projeto está contido inteiramente em um único arquivo (`index.html`), a execução é extremamente simples:

1. Baixe ou clone este repositório.
2. Abra o arquivo `index.html` diretamente em qualquer navegador moderno.

> ⚠️ **Nota sobre a Integração com a API:** > O script realiza uma chamada `fetch` diretamente para a API da Anthropic (`https://api.anthropic.com/v1/messages`). Para que a análise com IA funcione em produção, certifique-se de configurar corretamente os cabeçalhos de autenticação com a sua chave de API (`x-api-key`) ou rotear as requisições através de um servidor backend/serverless para proteger suas credenciais de exposição no front-end.

---

## 👥 Desenvolvedoras do Projeto
* Isabelle Firmino
* Vinicius Santos
