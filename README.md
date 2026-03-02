<div align="center">

# 🧬 MitoTools Web

**Comprehensive browser-based platform for interactive analysis of mitochondrial genomes.**

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue?logo=github)](https://github.com)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-CDN-38B2AC?logo=tailwindcss)](https://tailwindcss.com)

</div>

---

## 📖 About

**MitoTools Web** is a static web application designed for bioinformatics researchers working with mitochondrial genomes (mitogenomes). It provides **three interactive visualization tools** that run entirely in the browser — no backend, no installation, no queues.

All data processing happens **client-side** using JavaScript, making it fast, private, and deployable on **GitHub Pages**.

---

## 🛠️ Available Tools

### 📊 RSCU Analysis (Relative Synonymous Codon Usage)
- Upload multiple **TSV** files containing codon usage data
- Generate **stacked bar charts** comparing RSCU values across species
- Amino acids with multiple codon groups (e.g., Ser, Leu) are split into separate columns
- Built with [Plotly.js](https://plotly.com/javascript/) for interactive visualization

### 🧩 Gene Synteny
- Upload **BED** annotation files (e.g., from MITOS2)
- Visualize **linear gene maps** of mitogenome annotations
- Genes are displayed on positive (+) or negative (−) strands with proper coloring
- Includes a complete gene legend with standardized color coding

### 🔁 D-Loop / Tandem Repeats Analysis
- Upload **TXT** files with tandem repeat (TR) data from the control region
- Visualize **flanking blocks** and **TR circles** with copy number representation
- Supports two view modes: **Proportional** (bp strict) and **Aligned** (visual match)

---

## 🏗️ Project Structure

```
MitoWebTools/
├── index.html                      # Home page (landing)
├── pages/                          # Tool pages
│   ├── rscu.html                   # RSCU Analysis
│   ├── synteny.html                # Gene Synteny
│   └── dloop.html                  # D-Loop / Tandem Repeats
├── src/
│   ├── css/
│   │   └── custom.css              # Shared styles (dropzone, animations)
│   └── js/
│       ├── tailwind-config.js      # Centralized Tailwind configuration
│       ├── theme.js                # Dark mode management
│       ├── components/
│       │   ├── header.js           # Reusable navbar component
│       │   └── footer.js           # Reusable footer component
│       └── pages/
│           ├── rscu.js             # RSCU chart logic
│           ├── synteny.js          # Synteny map logic
│           └── dloop.js            # D-Loop visualization logic
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Option 1: Open directly
Simply open `index.html` in any modern browser. No build step required.

### Option 2: Local server (recommended for development)
```bash
# Using Python
python -m http.server 8080

# Or using Node.js
npx http-server . -p 8080
```
Then navigate to `http://localhost:8080`.

### Option 3: GitHub Pages
Push this repository to GitHub and enable **GitHub Pages** from the repository settings. The site will be available at `https://danhfg.github.io/MitoWebTools/`.

---

## 🔧 Tech Stack

| Technology | Usage |
|---|---|
| **HTML5** | Semantic page structure |
| **Tailwind CSS** (CDN) | Utility-first styling with dark mode |
| **JavaScript** (ES6+) | Client-side data processing and DOM manipulation |
| **Plotly.js** | Interactive scientific charts and visualizations |
| **PapaParse** | TSV/CSV file parsing |
| **Font Awesome** | UI icons |
| **Google Fonts** (Inter) | Typography |

---

## 🌙 Features

- ✅ **100% Client-Side** — No backend, no server, no data leaves the browser
- ✅ **Dark Mode** — Automatic detection + manual toggle with localStorage persistence
- ✅ **Responsive Design** — Mobile-friendly with collapsible navigation
- ✅ **Modular Architecture** — Reusable components (header, footer, theme)
- ✅ **GitHub Pages Ready** — Deploy with zero configuration
- ✅ **Interactive Charts** — Zoom, pan, hover with Plotly.js

---

## 📁 Input File Formats

### RSCU (`.tsv`)
Tab-separated file with codons in the first row, amino acid letters in the second, and RSCU values per species in subsequent rows:
```
CODONS	AAA	AAC	AAG	AAT	ACA	ACC	ACG	ACT	AGA	AGC	AGG	AGT	ATA	ATC	ATG	ATT	CAA	CAC	CAG	CAT	CCA	CCC	CCG	CCT	CGA	CGC	CGG	CGT	CTA	CTC	CTG	CTT	GAA	GAC	GAG	GAT	GCA	GCC	GCG	GCT	GGA	GGC	GGG	GGT	GTA	GTC	GTG	GTT	TAC	TAT	TCA	TCC	TCG	TCT	TGA	TGC	TGG	TGT	TTA	TTC	TTG	TTT	
AMINOACIDS	K	N	K	N	T	T	T	T	S	S	S	S	M	I	M	I	Q	H	Q	H	P	P	P	P	R	R	R	R	L	L	L	L	E	D	E	D	A	A	A	A	G	G	G	G	V	V	V	V	Y	Y	S	S	S	S	W	C	W	C	L	F	L	F	
HM126547.1_Euphaea_formosa_mitochondrion,_complete_genome	 1.621	 0.671	 0.379	 1.329	 1.439	 0.982	 0.468	 1.111	 1.567	 1.198	 0.828	 1.065	 1.631	 0.641	 0.369	 1.359	 1.382	 0.648	 0.618	 1.352	 1.642	 1.151	 0.283	 0.925	 1.745	 0.800	 0.436	 1.018	 0.946	 0.565	 0.404	 0.946	 1.422	 0.640	 0.578	 1.360	 1.692	 1.077	 0.205	 1.026	 1.385	 0.718	 0.923	 0.974	 1.556	 0.762	 0.635	 1.048	 0.717	 1.283	 1.420	 0.843	 0.163	 0.917	 1.188	 0.842	 0.812	 1.158	 2.227	 0.624	 0.912	 1.376	
```

### Synteny (`.bed`)
Standard BED6 format from MITOS2 annotations:
```
seq_name    start    end    gene_name    score    strand
Contig1	0	69	trnF(gaa)	9.99999982452e-14	+
Contig1	69	1026	rrnS	0.0	+
...
```

### D-Loop (`.txt`)
Custom format with species blocks:
```
>Species_name_1
start--end  CN:3.0
start--end  CN:2.0
total_length


>Species_name_2
start--end  CN:3.0
start--end  CN:2.5
total_length
```

---

## 📄 License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

You are free to share and adapt this work for **non-commercial purposes**, as long as you give appropriate credit.

---

## 👨‍🔬 Author

Developed as part of doctoral research in bioinformatics.

---

<div align="center">
<sub>Built with ❤️ for the mitogenomics community</sub>
</div>
