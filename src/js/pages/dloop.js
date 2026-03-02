const dropzoneDLOOP = document.getElementById('dropzoneDLOOP');
const fileInputDLOOP = document.getElementById('fileInputDLOOP');
const fileListDLOOP = document.getElementById('fileListDLOOP');
const filesUlDLOOP = document.getElementById('filesUlDLOOP');
const generateBtnDLOOP = document.getElementById('generateBtnDLOOP');
const resultsSectionDLOOP = document.getElementById('resultsSectionDLOOP');
const emptyStateDLOOP = document.getElementById('emptyStateDLOOP');
const dloopContainer = document.getElementById('dloopContainer');
const resetBtnDLOOP = document.getElementById('resetBtnDLOOP');

let selectedDloopFiles = [];

// Colors inspired by the reference image
const colors = {
    flank1: '#1ea47b', // Teal (Start)
    flank2: '#68b122', // Lime Green (Middle)
    flank3: '#6a6baf', // Purple (End)
    tr1: '#e16b09',    // Orange (TR-1)
    tr2: '#e52c8b',    // Pink (TR-2)
    srrna_trni: '#a4a5a5' // Gray edges
};

// Event Listeners for Upload
dropzoneDLOOP.addEventListener('click', () => fileInputDLOOP.click());
fileInputDLOOP.addEventListener('change', (e) => handleDloopFiles(e.target.files));
dropzoneDLOOP.addEventListener('dragover', (e) => { e.preventDefault(); dropzoneDLOOP.classList.add('dropzone-active'); });
dropzoneDLOOP.addEventListener('dragleave', () => dropzoneDLOOP.classList.remove('dropzone-active'));
dropzoneDLOOP.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneDLOOP.classList.remove('dropzone-active');
    handleDloopFiles(e.dataTransfer.files);
});

resetBtnDLOOP.addEventListener('click', () => {
    selectedDloopFiles = [];
    updateDloopList();
    resultsSectionDLOOP.classList.add('hidden');
    emptyStateDLOOP.classList.remove('hidden');
    fileInputDLOOP.value = '';
    dloopContainer.innerHTML = '';
});

function handleDloopFiles(files) {
    for (const file of files) {
        if (file.name.endsWith('.txt')) {
            if (!selectedDloopFiles.find(f => f.name === file.name)) {
                selectedDloopFiles.push(file);
            }
        }
    }
    updateDloopList();
}

function updateDloopList() {
    filesUlDLOOP.innerHTML = '';
    if (selectedDloopFiles.length > 0) {
        fileListDLOOP.classList.remove('hidden');
        generateBtnDLOOP.disabled = false;

        selectedDloopFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = "flex justify-between items-center bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm";
            li.innerHTML = `
                <span class="truncate text-gray-700 w-3/4" title="${file.name}"><i class="fa-solid fa-align-left text-gray-400 mr-2"></i>${file.name}</span>
                <button class="remove-dloop text-red-500 hover:text-red-700 transition-colors" data-index="${index}"><i class="fa-solid fa-xmark pointer-events-none"></i></button>
            `;
            filesUlDLOOP.appendChild(li);
        });

        document.querySelectorAll('.remove-dloop').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                selectedDloopFiles.splice(idx, 1);
                updateDloopList();
            });
        });
    } else {
        fileListDLOOP.classList.add('hidden');
        generateBtnDLOOP.disabled = true;
    }
}

// Generate
generateBtnDLOOP.addEventListener('click', async () => {
    if (selectedDloopFiles.length === 0) return;

    emptyStateDLOOP.classList.add('hidden');
    resultsSectionDLOOP.classList.remove('hidden');

    let allSpecies = [];

    // Parse TXT
    for (let i = 0; i < selectedDloopFiles.length; i++) {
        const file = selectedDloopFiles[i];
        const text = await file.text();

        // Split text by '>'
        const blocks = text.split('>').filter(b => b.trim().length > 0);

        blocks.forEach(block => {
            const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');
            if (lines.length < 2) return; // Invalid block

            // First line is species name, remove anything after '*' if exists, and replace '_'
            const rawName = lines[0];
            const speciesName = rawName.split('*')[0].trim().replace(/_/g, ' ');

            const trs = [];
            let totalLength = 0;

            for (let j = 1; j < lines.length; j++) {
                const line = lines[j];
                const trMatch = line.match(/(\d+)\s*[-]+\s*(\d+).*?CN\s*:\s*([0-9.]+)/i);
                if (trMatch) {
                    trs.push({
                        start: parseInt(trMatch[1], 10),
                        end: parseInt(trMatch[2], 10),
                        cn: parseFloat(trMatch[3])
                    });
                } else {
                    const lenMatch = line.match(/^\s*(\d+)\s*$/);
                    if (lenMatch) {
                        totalLength = parseInt(lenMatch[1], 10);
                    }
                }
            }

            if (totalLength > 0 || trs.length > 0) {
                // If totalLength is somehow 0 but we have TRs, infer it
                if (totalLength === 0 && trs.length > 0) {
                    totalLength = trs[trs.length - 1].end + 50;
                }

                allSpecies.push({
                    name: speciesName,
                    trs: trs,
                    totalLength: totalLength
                });
            }
        });
    }

    const viewMode = document.querySelector('input[name="dloopViewMode"]:checked').value;
    drawDloop(allSpecies, viewMode);
});

function drawDloop(speciesList, viewMode = 'proportional') {
    dloopContainer.innerHTML = '';

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const lineColor = isDark ? '#ffffff' : '#000000';
    const mutedTextColor = isDark ? '#d1d5db' : '#333333';

    const layoutHeight = Math.max(speciesList.length * 120 + 100, 300);

    const shapes = [];
    const annotations = [];
    let globalMaxEnd = 0;

    const xMarker = [];
    const yMarker = [];
    const colorMarker = [];
    const sizeMarker = [];

    // To make text inside hover distinct, we'll build a custom scatter trace for the TR circles text
    const textScatterX = [];
    const textScatterY = [];
    const textScatterText = [];

    // If aligned mode, we need to pre-calculate maximums for each 'column'
    // column 0 = flank1, column 1 = TR1, column 2 = flank2, etc.
    // However, some species might have missing TRs. We align by index.
    let maxCols = 0;
    speciesList.forEach(sp => {
        const cols = sp.trs.length * 2 + 1;
        if (cols > maxCols) maxCols = cols;
    });

    const colWidths = new Array(maxCols).fill(0);
    if (viewMode === 'aligned') {
        const FLANK_BASE_WIDTH = 150;
        const TR_CIRCLE_WIDTH = 40; // width per circle
        const MIN_TR_WIDTH = 100;

        for (let col = 0; col < maxCols; col++) {
            if (col % 2 === 0) {
                // Flank
                colWidths[col] = FLANK_BASE_WIDTH;
            } else {
                // TR
                const trIndex = Math.floor(col / 2);
                let maxCopies = 1;
                speciesList.forEach(sp => {
                    if (sp.trs[trIndex]) {
                        maxCopies = Math.max(maxCopies, Math.ceil(sp.trs[trIndex].cn));
                    }
                });
                colWidths[col] = Math.max(MIN_TR_WIDTH, maxCopies * TR_CIRCLE_WIDTH + 20); // padding
            }
        }
    }

    // Reverse iterate so first species is top
    for (let i = 0; i < speciesList.length; i++) {
        const species = speciesList[i];
        const yCenter = speciesList.length - i;
        const blockHeight = 0.25;

        // In proportional mode, x starts at 0. In aligned, it's cumulative from colWidths.
        let virtualX = 0;

        // Add Species Name Annotation on the far left
        annotations.push({
            x: -200, // Offset to the left
            y: yCenter,
            text: `<i>${species.name}</i>`,
            showarrow: false,
            xanchor: 'right',
            font: { size: 13, color: textColor }
        });

        // Draw Left Gray bar (srRNA)
        const srRNALeft = -150;
        const srRNARight = 0;
        shapes.push({
            type: 'rect',
            x0: srRNALeft, x1: srRNARight,
            y0: yCenter - 0.05, y1: yCenter + 0.05,
            fillcolor: colors.srrna_trni, line: { width: 0 }
        });
        annotations.push({
            x: srRNALeft, y: yCenter, text: '<b>srRNA</b>', showarrow: false, xanchor: 'right', font: { size: 10, color: mutedTextColor }
        });

        // Calculate Flanks and TRs
        let currentPos = 1; // 1-indexed (bp)

        for (let t = 0; t < species.trs.length; t++) {
            const tr = species.trs[t];
            const flankColIndex = t * 2;
            const trColIndex = t * 2 + 1;

            // Flank before TR
            let flankLen = tr.start - currentPos;
            const flankColorsArr = [colors.flank1, colors.flank2, colors.flank3, '#6baa2b', '#8c6bb1'];
            const flankColor = t < flankColorsArr.length ? flankColorsArr[t] : flankColorsArr[flankColorsArr.length - 1];

            // Render Width for Flank
            let visFlankW = (viewMode === 'aligned') ? colWidths[flankColIndex] : flankLen;
            if (flankLen <= 0 && viewMode === 'aligned') {
                // If it is aligned but len is 0 or negative (edge cases), we might still draw the block?
                // The image shows some very small blocks (e.g., 1 bp). Let's render always if aligned, 
                // but wait, if it's 0 it shouldn't be there. Let's just render the fixed width if it exists.
                // Assuming >= 0 is a flank.
            }
            if (flankLen < 0) flankLen = 0;

            if (flankLen >= 0) { // even if 0, drawn in aligned as space? Actually if 0 in proportional it draws nothing.
                if (viewMode === 'proportional' && flankLen === 0) visFlankW = 0;

                if (visFlankW > 0) {
                    shapes.push({
                        type: 'rect',
                        x0: virtualX, x1: virtualX + visFlankW,
                        y0: yCenter - blockHeight, y1: yCenter + blockHeight,
                        fillcolor: flankColor, line: { width: 0 }
                    });

                    if (flankLen > 0) {
                        annotations.push({
                            x: virtualX + visFlankW / 2,
                            y: yCenter,
                            text: `<b>${flankLen} bp</b>`,
                            showarrow: false,
                            font: { size: 11, color: 'white' }
                        });
                    }
                    virtualX += visFlankW;
                }
            }

            // The TR Region
            const trColorsArr = [colors.tr1, colors.tr2, '#d95f02', '#e7298a'];
            const trColor = t < trColorsArr.length ? trColorsArr[t] : trColorsArr[trColorsArr.length - 1];

            const copies = Math.ceil(tr.cn);
            const wAll = tr.end - tr.start + 1;

            let visTrW = (viewMode === 'aligned') ? colWidths[trColIndex] : wAll;
            const visSingleW = visTrW / copies;

            // Draw Black base line
            shapes.push({
                type: 'line',
                x0: virtualX, x1: virtualX + visTrW,
                y0: yCenter - blockHeight, y1: yCenter - blockHeight,
                line: { color: lineColor, width: 3 }
            });

            // Draw Dots on base line ends
            xMarker.push(virtualX); yMarker.push(yCenter - blockHeight); colorMarker.push(lineColor); sizeMarker.push(8);
            xMarker.push(virtualX + visTrW); yMarker.push(yCenter - blockHeight); colorMarker.push(lineColor); sizeMarker.push(8);

            // Draw TR title & length below
            annotations.push({
                x: virtualX + visTrW / 2, y: yCenter + blockHeight + 0.1, text: `<b>TR-${t + 1}</b>`, showarrow: false, font: { size: 10, color: textColor }
            });
            annotations.push({
                x: virtualX + visTrW / 2, y: yCenter - blockHeight - 0.1, text: `<b>${wAll} bp</b>`, showarrow: false, font: { size: 10, color: textColor }
            });

            // Draw Circles
            for (let c = 0; c < copies; c++) {
                const cx0 = virtualX + c * visSingleW;
                const cx1 = virtualX + (c + 1) * visSingleW;

                // Adjust gap slightly for aesthetic in aligned mode
                let padding = 0;
                if (viewMode === 'aligned' && visSingleW > 20) padding = 2; // small gap

                shapes.push({
                    type: 'circle',
                    x0: cx0 + padding, x1: cx1 - padding,
                    y0: yCenter - blockHeight, y1: yCenter + blockHeight,
                    fillcolor: trColor, line: { color: '#000', width: 1 }
                });

                annotations.push({
                    x: (cx0 + cx1) / 2, y: yCenter, text: `<b>${c + 1}</b>`, showarrow: false, font: { size: Math.max(8, Math.min(12, visSingleW / 4)), color: 'white' }
                });
            }

            virtualX += visTrW;
            currentPos = tr.end + 1;
        }

        // Final Flank after last TR
        const finalFlankColIndex = species.trs.length * 2;
        let flankLen = species.totalLength - currentPos + 1;
        if (flankLen < 0) flankLen = 0;

        let visFlankW = (viewMode === 'aligned') ? colWidths[finalFlankColIndex] : flankLen;
        if (viewMode === 'proportional' && flankLen === 0) visFlankW = 0;

        if (visFlankW > 0) {
            const flankColorsArr = [colors.flank1, colors.flank2, colors.flank3, '#6baa2b', '#8c6bb1'];
            const flankColor = species.trs.length < flankColorsArr.length ? flankColorsArr[species.trs.length] : colors.flank3;

            shapes.push({
                type: 'rect',
                x0: virtualX, x1: virtualX + visFlankW,
                y0: yCenter - blockHeight, y1: yCenter + blockHeight,
                fillcolor: flankColor, line: { width: 0 }
            });

            if (flankLen > 0) {
                annotations.push({
                    x: virtualX + visFlankW / 2,
                    y: yCenter,
                    text: `<b>${flankLen} bp</b>`,
                    showarrow: false,
                    font: { size: 11, color: 'white' }
                });
            }
            virtualX += visFlankW;
        }

        // Right Gray bar (trnI)
        shapes.push({
            type: 'rect',
            x0: virtualX, x1: virtualX + 150,
            y0: yCenter - 0.05, y1: yCenter + 0.05,
            fillcolor: colors.srrna_trni, line: { width: 0 }
        });
        annotations.push({
            x: virtualX + 150, y: yCenter, text: '<b>trnI</b>', showarrow: false, xanchor: 'left', font: { size: 10, color: mutedTextColor }
        });

        if (virtualX > globalMaxEnd) globalMaxEnd = virtualX;
    }

    // Create actual black dot trace
    const dotTrace = {
        x: xMarker, y: yMarker, mode: 'markers',
        marker: { color: colorMarker, size: sizeMarker },
        hoverinfo: 'none', showlegend: false
    };

    const layout = {
        height: layoutHeight,
        xaxis: {
            range: [-500, globalMaxEnd + 500],
            showgrid: false, zeroline: false, visible: false,
            fixedrange: false
        },
        yaxis: {
            range: [0.3, speciesList.length + 0.8],
            showgrid: false, zeroline: false, visible: false,
            fixedrange: true
        },
        margin: { l: 20, r: 20, t: 40, b: 20 },
        shapes: shapes,
        annotations: annotations,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        hovermode: 'closest',
        dragmode: 'pan'
    };

    Plotly.newPlot('dloopContainer', [dotTrace], layout, { responsive: true, displayModeBar: true, scrollZoom: true });
}
