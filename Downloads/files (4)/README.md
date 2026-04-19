---
title: BapujiAI — Life in the Multiverse Q&A Guide
emoji: 🌌
colorFrom: purple
colorTo: orange
sdk: gradio
sdk_version: "4.19.0"
app_file: app.py
pinned: false
license: mit
---

# 🌌 BapujiAI — Life in the Multiverse Q&A Guide

> Teachings of **Pujya Bapuji Dashrathbhai Patel**  
> 🙏 [paramshanti.org](https://paramshanti.org)

**Live:** https://huggingface.co/spaces/Anwesha11111/BapujiAI

A free, worldwide spiritual Q&A assistant built with:
- 📚 **820 real chunks** OCR'd from the actual 276-page book
- 🔍 **FAISS** semantic search (sentence-transformers)  
- 🤖 **google/flan-t5-large** via HF free Inference API (no key needed)
- 🎨 **Gradio** — deep-space spiritual UI

---

## How It Works

```
Your Question → Embed → FAISS top-5 passages → flan-t5-large → Answer + Sources
```

## Local Setup

```bash
git clone https://huggingface.co/spaces/Anwesha11111/BapujiAI
cd BapujiAI
pip install -r requirements.txt
python app.py   # → http://localhost:7860
```

*Built with love for free global access to Bapuji's cosmic wisdom. 🙏*
