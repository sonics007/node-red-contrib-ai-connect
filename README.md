# node-red-contrib-ai-connect

Univerzálny Node-RED node pre pripojenie k AI službám: **Perplexity AI**, **Anthropic Claude**, **Google Gemini**, **xAI Grok**, **DeepSeek** a **OpenAI (ChatGPT)**.

## Vlastnosti

- **Multi-Provider Support** - Jeden node pre 6 rôznych AI služieb
- **Perplexity AI** - Sonar modely s webovým vyhľadávaním v reálnom čase
- **Anthropic Claude** - Claude 3 & 3.5 modely s pokročilým reasoning
- **Google Gemini** - Gemini 1.x & 2.x modely s multimodálnymi schopnosťami
- **xAI Grok** - Grok 2/3 modely optimalizované pre konverzácie
- **DeepSeek** - DeepSeek Chat a Reasoner (R1) modely
- **OpenAI** - GPT-4o, GPT-4, GPT-3.5, O1 modely
- **Perplexity Intent** - Automatická detekcia intentov v správach
- **Dynamické prepínanie** - Možnosť meniť poskytovateľa cez msg.provider
- Web search options pre Perplexity (domain filter, recency filter)
- História konverzácií
- Citácie a zdroje v odpovediach (Perplexity)

## Inštalácia

### Cez Node-RED palette manager

1. Otvorte Node-RED editor
2. Menu → Manage palette → Install
3. Vyhľadajte `@sonics007/node-red-contrib-ai-connect`
4. Kliknite Install

### Manuálna inštalácia

```bash
cd ~/.node-red
npm install @sonics007/node-red-contrib-ai-connect
```

## Získanie API kľúčov

### Perplexity AI
1. Prihláste sa na [perplexity.ai](https://www.perplexity.ai)
2. Prejdite do Settings → API
3. Vytvorte nový API kľúč (začína `pplx-...`)

### Anthropic Claude
1. Vytvorte účet na [console.anthropic.com](https://console.anthropic.com)
2. Prejdite do Settings → API Keys
3. Vytvorte nový API kľúč (začína `sk-ant-...`)

### Google Gemini
1. Vytvorte účet na [aistudio.google.com](https://aistudio.google.com)
2. Kliknite na "Get API key"
3. Vytvorte nový API kľúč (začína `AIza...`)

### xAI Grok
1. Vytvorte účet na [console.x.ai](https://console.x.ai)
2. Vygenerujte API kľúč (začína `xai-...`)
3. ⚠️ **Poznámka**: Grok API je platené a vyžaduje zakúpenie kreditov

### DeepSeek
1. Vytvorte účet na [platform.deepseek.com](https://platform.deepseek.com)
2. Prejdite do API Keys
3. Vytvorte nový API kľúč (začína `sk-...`)

### OpenAI (ChatGPT)
1. Vytvorte účet na [platform.openai.com](https://platform.openai.com)
2. Prejdite do API Keys
3. Vytvorte nový API kľúč (začína `sk-...`)

## Nodes

### AI Config

Univerzálny konfiguračný node pre všetkých AI poskytovateľov. Môžete nakonfigurovať viacero poskytovateľov naraz.

**Nastavenia:**
- **Názov**: Popisný názov konfigurácie
- **Poskytovateľ**: Vyberte AI službu (Perplexity, Claude, Gemini, Grok, DeepSeek, OpenAI)
- **API Key**: API kľúč pre vybraného poskytovateľa

**Tip:** Vytvorte samostatný config node pre každého poskytovateľa alebo jeden config node so všetkými API kľúčmi.

### AI Chat

Univerzálny chat node pre konverzácie s rôznymi AI službami.

**Nastavenia:**
- **Poskytovateľ**: Vyberte AI službu
- **Model**: Dostupné modely pre vybraného poskytovateľa:
  - **Perplexity**: sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro, sonar-deep-research
  - **Claude**: claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus, claude-3-sonnet, claude-3-haiku
  - **Gemini**: gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash, gemini-1.0-pro
  - **Grok**: grok-3, grok-3-mini, grok-2-latest, grok-2-1212, grok-beta
  - **DeepSeek**: deepseek-chat, deepseek-reasoner
  - **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4, gpt-3.5-turbo, o1, o1-mini
- **Max tokenov**: Maximálny počet tokenov v odpovedi
- **Temperatura**: Kreativita odpovede 0-2 (default: 0.7)
- **Systémový prompt**: Voliteľný systémový prompt
- **Webové vyhľadávanie** (len Perplexity): Zapnúť/vypnúť web search
- **Domain Filter** (len Perplexity): Obmedziť vyhľadávanie na konkrétne domény
- **Recency Filter** (len Perplexity): Časové obmedzenie výsledkov (day/week/month/year)

**Vstup:**
```javascript
// Jednoduchá správa
msg.payload = "Aké sú najnovšie správy o AI?";

// Dynamické prepínanie poskytovateľa
msg.provider = "claude";  // prepne na Claude API
msg.payload = "Analyzuj tento text...";

// Konverzácia
msg.payload = [
  { role: "user", content: "Vysvetli mi kvantové počítanie" },
  { role: "assistant", content: "Kvantové počítanie je..." },
  { role: "user", content: "Aké sú jeho praktické využitia?" }
];
```

**Výstup:**
```javascript
// msg.payload - textová odpoveď
// msg.ai - kompletné info
{
  provider: "perplexity", // použitý poskytovateľ
  response: {...},         // plná API odpoveď
  messages: [...],         // história konverzácie
  usage: {...},            // token usage
  model: "sonar",          // použitý model
  citations: [...]         // citácie (len Perplexity)
}
```

### Perplexity Intent

Node na detekciu intentov (zámerov) v používateľských správach.

**Nastavenia:**
- **Model**: Sonar alebo Sonar Pro
- **Typ výstupu**:
  - Separátne výstupy - každý intent má vlastný výstup
  - Jeden výstup - všetky intenty na jeden výstup s msg.intent
- **Intenty**: Zoznam intentov s názvami a popismi

**Vstup:**
```javascript
msg.payload = "Ahoj, ako sa máš?";
```

**Výstup:**
```javascript
msg.intent = {
  matched: true,
  name: "greeting",
  description: "Pozdravy a uvítanie",
  confidence: 1,
  originalMessage: "Ahoj, ako sa máš?"
}
```

## Príklady použitia

### Jednoduchý chatbot s webovým vyhľadávaním

```
[inject] → [function] → [perplexity-chat] → [debug]

function node:
msg.payload = "Aké sú najnovšie správy o AI?";
return msg;
```

### Intent-based router

```
[inject] → [perplexity-intent] → [switch] → [function]
                               → [switch] → [function]
                               → [switch] → [function]

perplexity-intent nastavenie:
- Intenty: greeting, question, farewell
- Typ výstupu: Separátne výstupy

Každý intent ide na samostatný výstup pre špecifické spracovanie.
```

### Konverzácia s históriou

```
[inject] → [function] → [perplexity-chat] → [function] → [debug]
              ↑                                  ↓
              └──────────────────────────────────┘

function node (pred):
msg.payload = msg.payload || [];
msg.payload.push({
  role: "user",
  content: msg.text
});
return msg;

function node (po):
// Uložiť históriu pre ďalšiu správu
flow.set("messages", msg.perplexity.messages);
return msg;
```

## AI Modely

### Perplexity AI Modely

**Sonar**
- Rýchly a cenovo výhodný
- Vhodný pre základné dotazy a konverzácie
- Podpora webového vyhľadávania

**Sonar Pro**
- Pokročilé reasoning schopnosti
- Hlbšie webové vyhľadávanie
- Lepšia presnosť a kvalita odpovedí

**Sonar Reasoning / Reasoning Pro**
- Modely optimalizované pre logické uvažovanie
- Sonar Reasoning Pro využíva DeepSeek-R1

**Sonar Deep Research**
- Expert-level výskumný model
- Produkuje dlhé, dobre zdokumentované reporty s množstvom citácií

### Claude Modely

**Claude 3.5 Sonnet**
- Najvýkonnejší Claude model
- Vynikajúce reasoning a kódovacie schopnosti
- Dlhý kontext (200K tokenov)

**Claude 3.5 Haiku**
- Najrýchlejší Claude model
- Nízka latencia pre real-time aplikácie

**Claude 3 Opus**
- Najpokročilejší Claude 3 model
- Najlepší pre komplexné úlohy

### Gemini Modely

**Gemini 2.0 Flash (Experimental)**
- Najnovší Gemini model
- Rýchle generovanie s vylepšenou presnosťou

**Gemini 1.5 Pro**
- Dlhý kontext (1M tokenov)
- Multimodálne schopnosti

**Gemini 1.5 Flash**
- Optimalizovaný pre rýchlosť a efektivitu

### Grok Modely

**Grok 3**
- Najnovší a najvýkonnejší Grok model
- Vylepšené reasoning a konverzačné schopnosti
- Najlepší pre komplexné úlohy

**Grok 3 Mini**
- Rýchlejšia a efektívnejšia verzia Grok 3
- Nižšia latencia pre real-time aplikácie
- Dobrý pomer výkonu a rýchlosti

**Grok 2 (Latest)**
- Predchádzajúca verzia Grok
- Stabilný a overený

**Grok 2 (Dec 12)**
- Stabilná verzia z decembra 2024

**Grok Beta**
- Beta verzia s experimentálnymi funkciami

### DeepSeek Modely

**DeepSeek Chat**
- Výkonný chat model
- Dobrý pomer cena/výkon
- Vhodný pre všeobecné úlohy

**DeepSeek Reasoner (R1)**
- Špecializovaný reasoning model
- Pokročilé logické uvažovanie
- Podobný OpenAI O1

### OpenAI Modely

**GPT-4o**
- Najnovší multimodálny model
- Vynikajúci výkon a rýchlosť
- Najlepší pomer výkon/cena

**GPT-4o Mini**
- Zľahčená verzia GPT-4o
- Nižšia cena, rýchlejšie odpovede
- Vhodný pre jednoduché úlohy

**GPT-4 Turbo / GPT-4**
- Pokročilé reasoning schopnosti
- Dlhý kontext (128K tokenov)
- Vysoká presnosť

**GPT-3.5 Turbo**
- Rýchly a cenovo výhodný
- Vhodný pre základné úlohy

**O1 / O1 Mini**
- Reasoning modely optimalizované pre logické úlohy
- Dlhé "premýšľanie" pred odpoveďou
- Najlepšie pre komplexné problémy

## Web Search Features

Perplexity AI automaticky vyhľadáva aktuálne informácie na webe:

- **Domain Filter**: Obmedzte vyhľadávanie len na dôveryhodné zdroje
  ```
  wikipedia.org, bbc.com, reuters.com
  ```

- **Recency Filter**: Získajte len čerstvé informácie
  - `day` - posledných 24 hodín
  - `week` - posledný týždeň
  - `month` - posledný mesiac
  - `year` - posledný rok

- **Citations**: Každá odpoveď obsahuje odkazy na zdroje

## Licencia

MIT

## Autor

sonics007

## Podpora

Pre problémy a feature requesty použite [GitHub Issues](https://github.com/sonics007/node-red-contrib-ai-connect/issues)

## Changelog

### 2.1.0
- **DeepSeek Support** - Pridaná podpora pre DeepSeek Chat a Reasoner (R1)
- **OpenAI Support** - Pridaná podpora pre ChatGPT (GPT-4o, GPT-4, GPT-3.5, O1)
- **Token Usage Tracking** - Nová záložka "Spotreba tokenov" v editore
  - Real-time sledovanie spotreby input/output tokenov
  - Celková štatistika a priemer na request
  - Možnosť resetovania štatistík
- Vylepšené error handling pre Grok (detekcia chýbajúcich kreditov)

### 2.0.0
- **Multi-Provider Support** - Pridaná podpora pre Claude, Gemini a Grok
- Univerzálny AI Config node pre všetkých poskytovateľov
- Univerzálny AI Chat node s výberom poskytovateľa
- Dynamické prepínanie poskytovateľa cez `msg.provider`
- Rozšírené modely Perplexity: sonar-reasoning, sonar-reasoning-pro, sonar-deep-research
- Claude modely: 3.5 Sonnet, 3.5 Haiku, 3 Opus, 3 Sonnet, 3 Haiku
- Gemini modely: 2.0 Flash, 1.5 Pro, 1.5 Flash, 1.0 Pro
- Grok modely: grok-3, grok-3-mini, grok-2-latest, grok-2-1212, grok-beta
- Zmenené výstupné pole z `msg.perplexity` na `msg.ai`
- Web search možnosti zostávajú len pre Perplexity

### 1.0.0
- Prvé vydanie
- Perplexity Chat node
- Perplexity Intent node
- Perplexity Config node
- Podpora Sonar a Sonar Pro modelov
- Web search options
