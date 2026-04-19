"""
Life in the Multiverse — Q&A Guide
Teachings of Pujya Bapuji Dashrathbhai Patel (paramshanti.org)

Stack: Gradio + FAISS RAG + HF Inference API (free, no key required)
Book:  "Life in the Multiverse" — OCR'd from the actual PDF (276 pages, 820 chunks)
"""

# ── Silence TF/oneDNN noise BEFORE any other imports ────────────────────────
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import json, time, requests
import numpy as np

# ─────────────────────────────────────────────
# 1. SYSTEM PROMPT
# ─────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are Bapuji's Cosmic Guide — a spiritual assistant grounded in "
    "'Life in the Multiverse' by Pujya Bapuji Dashrathbhai Patel (paramshanti.org).\n\n"
    "Use ONLY the context passages below. Topics: multiverse, G-levels, atma, "
    "Param Prakash, karma, moksha, Lokas, Akram Vignan, celestial beings, "
    "crop circles, Sanatan Shastras, Akashic records.\n\n"
    "Rules: answer in 3-5 uplifting sentences; if context doesn't cover it say so; "
    "decline medical/financial/legal questions politely; "
    "always end with: 'Visit paramshanti.org to explore more.'\n\n"
    "Context:\n\"\"\"\n{chunks}\n\"\"\"\n\nQuestion: {question}\n\nAnswer:"
)

# ─────────────────────────────────────────────
# 2. LOAD CHUNKS
# ─────────────────────────────────────────────
CHUNKS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "book_chunks.json")
SAMPLE_CHUNKS = [
    "The multiverse consists of infinite parallel universes vibrating at different G-levels (Gnan levels), from gross material realms to the subtlest planes of Param Prakash.",
    "The soul (atma) journeys through G-levels across countless lifetimes. Liberation (moksha) is attained when it recognises its true nature: pure consciousness.",
    "Param Prakash is the Supreme Light that pervades all universes. In Akram Vignan one can receive its grace through self-realisation (Gnan Vidhi).",
    "Karma is the mechanism that binds the soul to birth and death. By understanding Dada Bhagwan's science one can discharge karma without charging new karma.",
    "There are seven Lokas above Earth within our solar system and seven Patal Lokas below, perceived by Bapuji through divine vision in deep meditation.",
    "Crop circles are geometric patterns created by subtle-world souls (extraterrestrials) to communicate cosmic knowledge to humanity.",
    "The Akashic records contain the complete history of every soul across all lifetimes and dimensions, readable by those with sufficient soul power.",
    "Celestial beings (devas) inhabit higher G-levels with great pleasure and long lifespans, but must return to human form for final liberation.",
    "Akram (stepless path) allows direct Self-realisation in a single sitting — Bapuji's gift to the world, a shortcut to moksha without renouncing worldly life.",
    "The soul in its pure form is sat-chit-anand: eternal existence, infinite consciousness, absolute bliss. Samsara is the experience of forgetting this truth.",
]

def load_chunks():
    if os.path.exists(CHUNKS_FILE):
        with open(CHUNKS_FILE, encoding="utf-8") as f:
            chunks = json.load(f)
        print(f"Loaded {len(chunks)} chunks from book_chunks.json")
        return chunks
    print("WARNING: book_chunks.json not found, using sample chunks")
    return SAMPLE_CHUNKS

# ─────────────────────────────────────────────
# 3. FAISS INDEX
# ─────────────────────────────────────────────
_embedder = None
_index = None
_all_chunks = []
INDEX_CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "faiss_index.npy")

def get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        print("Loading embedding model...")
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        print("Embedder ready.")
    return _embedder

def build_index(chunks):
    global _index, _all_chunks
    import faiss
    _all_chunks = chunks
    if os.path.exists(INDEX_CACHE):
        print("Loading cached FAISS index...")
        vecs = np.load(INDEX_CACHE).astype("float32")
        _index = faiss.IndexFlatL2(vecs.shape[1])
        _index.add(vecs)
        print(f"Index loaded ({len(_all_chunks)} chunks).")
        return
    print(f"Building FAISS index for {len(chunks)} chunks...")
    model = get_embedder()
    vecs = model.encode(chunks, show_progress_bar=True, batch_size=64).astype("float32")
    _index = faiss.IndexFlatL2(vecs.shape[1])
    _index.add(vecs)
    np.save(INDEX_CACHE, vecs)
    print("FAISS index built and cached.")

def retrieve(query, k=5):
    if _index is None or not _all_chunks:
        return _all_chunks[:k]
    model = get_embedder()
    qvec = model.encode([query]).astype("float32")
    _, ids = _index.search(qvec, k)
    return [_all_chunks[i] for i in ids[0] if i < len(_all_chunks)]

# ─────────────────────────────────────────────
# 4. HF INFERENCE API
# ─────────────────────────────────────────────
HF_API_URL = "https://api-inference.huggingface.co/models/google/flan-t5-large"
HF_HEADERS = {"Content-Type": "application/json"}
_tok = os.environ.get("HF_TOKEN", "")
if _tok:
    HF_HEADERS["Authorization"] = f"Bearer {_tok}"

def call_llm(prompt, retries=3):
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 300, "temperature": 0.7,
                       "do_sample": True, "repetition_penalty": 1.3},
        "options": {"wait_for_model": True},
    }
    for attempt in range(retries):
        try:
            r = requests.post(HF_API_URL, headers=HF_HEADERS, json=payload, timeout=60)
            if r.status_code == 200:
                data = r.json()
                text = data[0].get("generated_text", "").strip() if isinstance(data, list) else ""
                if "Answer:" in text:
                    text = text.split("Answer:")[-1].strip()
                if text:
                    return text
            elif r.status_code == 503:
                time.sleep(20 * (attempt + 1))
            else:
                print(f"HF API {r.status_code}: {r.text[:200]}")
                break
        except Exception as e:
            print(f"Request error: {e}")
            time.sleep(10)
    return "The model is warming up (free tier). Please try again in ~30 seconds. Namaste!"

# ─────────────────────────────────────────────
# 5. RAG CHAT
# ─────────────────────────────────────────────
OFF_TOPIC = ["invest","stock","medicine","diagnosis","prescri","legal","lawyer","lawsuit","tax","insurance"]

def rag_chat(message, history):
    if not message.strip():
        return history, ""
    if any(w in message.lower() for w in OFF_TOPIC):
        ans = ("I offer only spiritual guidance from Bapuji's teachings. "
               "For medical, financial or legal matters please consult a qualified professional.\n\n"
               "Visit paramshanti.org to explore more.")
    else:
        chunks = retrieve(message, k=5)
        context = "\n\n---\n\n".join(chunks)
        prompt = SYSTEM_PROMPT.format(chunks=context, question=message)
        ans = call_llm(prompt)
        if "paramshanti.org" not in ans:
            ans += "\n\n Visit paramshanti.org to explore more."
        ans += "\n\n---\n**Relevant passages from the book:**\n"
        for i, c in enumerate(chunks[:3], 1):
            ans += f"\n_{i}. {c[:130].replace(chr(10),' ').strip()}..._"
    history.append((message, ans))
    return history, ""

# ─────────────────────────────────────────────
# 6. GRADIO UI
# ─────────────────────────────────────────────
import gradio as gr

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Jost:wght@300;400;500&display=swap');
:root{--saffron:#E8811A;--deep:#1A0A2E;--mid:#2D1654;--gold:#F5C842;--cream:#FDF6E3;--muted:#B8A9D0}
body,.gradio-container{background:radial-gradient(ellipse at 20% 10%,#2D1654 0%,#1A0A2E 55%,#0D0520 100%) !important;font-family:'Jost',sans-serif !important;color:var(--cream) !important}
#hdr{text-align:center;padding:1.8rem 1rem 1rem;border-bottom:1px solid rgba(245,200,66,.2)}
.message.user{background:linear-gradient(135deg,var(--mid),#3D2070) !important;border:1px solid rgba(245,200,66,.3) !important;border-radius:18px 18px 4px 18px !important;color:var(--cream) !important;font-family:'Jost',sans-serif !important}
.message.bot{background:linear-gradient(135deg,rgba(26,10,46,.9),rgba(13,5,32,.95)) !important;border:1px solid rgba(232,129,26,.35) !important;border-radius:18px 18px 18px 4px !important;color:var(--cream) !important;font-family:'Jost',sans-serif !important;line-height:1.8 !important}
textarea,input[type=text]{background:rgba(45,22,84,.5) !important;border:1px solid rgba(245,200,66,.4) !important;border-radius:12px !important;color:var(--cream) !important;font-family:'Jost',sans-serif !important}
textarea::placeholder,input::placeholder{color:var(--muted) !important}
button.primary{background:linear-gradient(135deg,var(--saffron),#C96A0A) !important;border:none !important;border-radius:10px !important;color:#fff !important;font-family:'Jost',sans-serif !important;font-weight:500 !important;letter-spacing:.04em !important;transition:all .2s !important}
button.primary:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(232,129,26,.5) !important}
.example-set button{background:rgba(45,22,84,.6) !important;border:1px solid rgba(245,200,66,.3) !important;color:var(--cream) !important;border-radius:20px !important;font-size:.85rem !important}
#ftr{text-align:center;padding:1rem;opacity:.65;font-size:.82rem;color:#8878AA}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:var(--deep)}::-webkit-scrollbar-thumb{background:var(--mid);border-radius:4px}
"""

HEADER = """<div id="hdr">
  <div style="font-size:2.4rem;margin-bottom:.3rem">🌌</div>
  <h1 style="font-family:'Cormorant Garamond',serif;font-size:2.1rem;font-weight:600;background:linear-gradient(90deg,#F5C842,#E8811A);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 .25rem">Life in the Multiverse</h1>
  <p style="color:#B8A9D0;font-size:.95rem;margin:0 0 .1rem">Q&amp;A Guide · Teachings of <em>Pujya Bapuji Dashrathbhai Patel</em></p>
  <p style="font-size:.78rem;color:#6858A0;margin:0">✨ RAG over the actual 276-page book · HuggingFace Inference API · Completely Free</p>
</div>"""

FOOTER = """<div id="ftr" style="font-family:'Jost',sans-serif">
  🙏 Jai Sat Chit Anand &nbsp;·&nbsp;
  <a href="https://paramshanti.org" target="_blank" style="color:#E8811A;text-decoration:none">paramshanti.org</a>
  &nbsp;·&nbsp; Free · Worldwide · Forever
</div>"""

EXAMPLES = [
    "What is the multiverse according to Bapuji's teachings?",
    "How many G-levels exist and what do they mean for a soul's evolution?",
    "What is Param Prakash and how can I experience it?",
    "What are the seven Lokas above Earth?",
    "What is Akram Vignan and why is it a shortcut to moksha?",
    "How does karma work across different dimensions?",
    "Who are the celestial beings described in the book?",
    "What are crop circles and what do they mean spiritually?",
    "What happens to the soul after physical death?",
    "What are the Akashic records?",
]

theme = gr.themes.Base(
    primary_hue=gr.themes.colors.orange,
    secondary_hue=gr.themes.colors.purple,
    neutral_hue=gr.themes.colors.slate,
    font=[gr.themes.GoogleFont("Jost"), "sans-serif"],
).set(body_background_fill="transparent")

with gr.Blocks(theme=theme, css=CSS, title="Life in the Multiverse — Bapuji's Guide") as demo:
    gr.HTML(HEADER)
    chatbot = gr.Chatbot(label="", height=490, bubble_full_width=False, show_label=False)
    with gr.Row():
        msg = gr.Textbox(placeholder="Ask about the multiverse, G-levels, Lokas, karma, moksha…",
                         show_label=False, scale=9, lines=1)
        send_btn = gr.Button("Ask 🙏", variant="primary", scale=1)
    gr.Examples(examples=EXAMPLES, inputs=msg, label="✨ Try these questions")
    gr.HTML(FOOTER)
    send_btn.click(rag_chat, [msg, chatbot], [chatbot, msg])
    msg.submit(rag_chat, [msg, chatbot], [chatbot, msg])

# ─────────────────────────────────────────────
# 7. STARTUP (runs on HF Spaces AND locally)
# ─────────────────────────────────────────────
print("Starting up Life in the Multiverse Guide...")
_chunks = load_chunks()
build_index(_chunks)
print("Ready!")

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860, share=False)
