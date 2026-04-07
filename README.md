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

**MitoTools Web** is a static web application designed for bioinformatics researchers working with mitochondrial genomes (mitogenomes). It provides **six interactive visualization tools** that run entirely in the browser — no backend, no installation, no queues.

All data processing happens **client-side** using JavaScript, making it fast, private, and deployable on **GitHub Pages**.

---

## 🛠️ Available Tools

### 📊 RSCU Analysis (Relative Synonymous Codon Usage)
- Upload multiple **TSV** files containing codon usage data or **FASTA** sequences
- Generate **stacked bar charts** comparing RSCU values across species
- Amino acids with multiple codon groups (e.g., Ser, Leu) are split into separate columns
- Supports direct calculation from FASTA with selectable **NCBI genetic code tables**
- Built with [Plotly.js](https://plotly.com/javascript/) for interactive visualization

### � Codon Usage Analysis *(New in v0.3)*
- Unified tool supporting **three metrics**:
  - **Codon Usage** — absolute codon counts
  - **Codon Usage per Thousand** — frequency normalized per 1000 codons
  - **RSCU** — Relative Synonymous Codon Usage
- Accepts both **pre-processed TSV/CSV** files and **FASTA** sequences
- Includes all amino acids (Met, Trp) for Codon Usage and Codon Usage per Thousand
- Dynamic y-axis scaling based on stacked column heights
- Supports all **NCBI translation tables** (1–33)

### 🧩 Gene Synteny
- Upload **BED** annotation files (e.g., from MITOS2)
- Visualize **linear gene maps** of mitogenome annotations
- Genes are displayed on positive (+) or negative (−) strands with proper coloring
- Robust gene name normalization (nad1/ND1/nd1, COX1 gene, cytb/cob, etc.)
- Includes a complete gene legend with standardized color coding

### 📏 Gene Size Comparison *(New in v0.3)*
- Upload multiple **BED** annotation files (one per species)
- Compare **protein-coding gene sizes** across species in an interactive grid
- Each gene column has its **own independent scale**
- Automatic gene name normalization and fragment summing
- Export as **high-resolution PNG** (publication quality) or **interactive HTML**
- 13 canonical mitochondrial genes: nad1–6, nad4l, cox1–3, atp6, atp8, cob

### 📈 Ka/Ks Analysis *(New in v0.3)*
- Upload **FASTA** genome files and **BED** annotations (one pair per species)
- Calculates **Ka** (nonsynonymous), **Ks** (synonymous), and **Ka/Ks** ratios using the **Nei-Gojobori (1986)** method with Jukes-Cantor correction — entirely client-side
- Three visualization modes:
  - **Boxplot** — Ka/Ks ratio distribution per gene across all pairwise comparisons
  - **Bar Chart** — mean Ka, Ks, and Ka/Ks grouped by gene
  - **Sankey Diagram** — Start/Stop codon usage (Initiation Codon → PCG → Termination Codon)
- Supports all **NCBI genetic code tables** (1–33)
- Handles incomplete stop codons (T--, TA-) common in mitogenomes
- Publication-quality **PNG** and interactive **HTML** export

### 🔁 D-Loop / Tandem Repeats Analysis
- Upload **TXT** files with tandem repeat (TR) data from the control region
- Visualize **flanking blocks** and **TR circles** with copy number representation
- Supports two view modes: **Proportional** (bp strict) and **Aligned** (visual match)

---

## 📋 Changelog

### v0.3 — Codon Usage, Gene Size & Ka/Ks
- **New tool:** Codon Usage Analysis page with support for Codon Usage (count), Codon Usage per Thousand (‰), and RSCU metrics
- **New tool:** Gene Size Comparison — horizontal bar grid from BED files with publication-quality PNG/HTML export
- **New tool:** Ka/Ks Analysis — Nei-Gojobori (1986) client-side computation with boxplot, bar chart, and Sankey diagram visualizations
- New utilities: `bed-parser.js` (BED parsing + gene normalization) and `kaks-calculator.js` (Ka/Ks engine)
- Improved gene name handling in Gene Synteny (supports `ND2 gene`, `CYTB gene`, `tRNA-Ile`, etc.)
- Updated navigation header and homepage cards

### v0.2 — FASTA Support & SVG Logo
- Added FASTA input support for RSCU Analysis with all NCBI genetic code tables
- Integrated vectorized SVG mitochondria logo in header and footer
- Amino acid split for Ser (AG/UC) and Leu (CU/UU) codon groups in RSCU charts

### v0.1 — Initial Release
- RSCU Analysis with pre-processed TSV files
- Gene Synteny visualization from BED files
- D-Loop / Tandem Repeats analysis
- Dark mode, responsive design, GitHub Pages deployment

---

## 🏗️ Project Structure

```
MitoWebTools/
├── index.html                      # Home page (landing)
├── pages/                          # Tool pages
│   ├── rscu.html                   # RSCU Analysis
│   ├── codon-usage.html            # Codon Usage Analysis (CU, CU/1000, RSCU)
│   ├── gene-size.html              # Gene Size Comparison
│   ├── kaks.html                   # Ka/Ks Analysis
│   ├── synteny.html                # Gene Synteny
│   └── dloop.html                  # D-Loop / Tandem Repeats
├── src/
│   ├── css/
│   │   └── custom.css              # Shared styles (dropzone, animations)
│   ├── img/
│   │   └── mitochondria.svg        # Vectorized logo
│   └── js/
│       ├── tailwind-config.js      # Centralized Tailwind configuration
│       ├── theme.js                # Dark mode management
│       ├── components/
│       │   ├── header.js           # Reusable navbar component
│       │   └── footer.js           # Reusable footer component
│       ├── utils/
│       │   ├── rscu-calculator.js  # Codon usage & RSCU calculation engine
│       │   ├── bed-parser.js       # BED file parser & gene name normalization
│       │   └── kaks-calculator.js  # Ka/Ks engine (Nei-Gojobori 1986)
│       └── pages/
│           ├── rscu.js             # RSCU chart logic
│           ├── codon-usage.js      # Codon Usage chart logic
│           ├── gene-size.js        # Gene Size comparison logic
│           ├── kaks.js             # Ka/Ks analysis logic
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
- ✅ **FASTA Support** — Calculate metrics directly from nucleotide sequences
- ✅ **Multiple Genetic Codes** — All NCBI translation tables (1–33)

---

## 📁 Input File Formats

### RSCU / Codon Usage (`.tsv`)
Tab-separated file with codons in the first row, amino acid letters in the second, and values per species in subsequent rows:
```
CODONS	AAA	AAC	AAG	AAT	ACA	ACC	ACG	ACT	AGA	AGC	AGG	AGT	ATA	ATC	ATG	ATT	CAA	CAC	CAG	CAT	CCA	CCC	CCG	CCT	CGA	CGC	CGG	CGT	CTA	CTC	CTG	CTT	GAA	GAC	GAG	GAT	GCA	GCC	GCG	GCT	GGA	GGC	GGG	GGT	GTA	GTC	GTG	GTT	TAC	TAT	TCA	TCC	TCG	TCT	TGA	TGC	TGG	TGT	TTA	TTC	TTG	TTT	
AMINOACIDS	K	N	K	N	T	T	T	T	S	S	S	S	M	I	M	I	Q	H	Q	H	P	P	P	P	R	R	R	R	L	L	L	L	E	D	E	D	A	A	A	A	G	G	G	G	V	V	V	V	Y	Y	S	S	S	S	W	C	W	C	L	F	L	F	
HM126547.1_Euphaea_formosa	 1.621	 0.671	 0.379	 1.329	 1.439	 0.982	 0.468	 1.111	...
```

### FASTA (`.fasta`, `.fa`, `.fna`, `.fas`)
Standard FASTA format with nucleotide sequences:
```
>Species_name_1
ATGTTCGCCGACCGTTGACTATTCTCTACAAACCACAAAGAC...

>Species_name_2
ATGTTCATTAATCGTTGACTATTCTCAACCAATCACAAAGAT...
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
