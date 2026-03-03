// Footer Component — Injeção dinâmica do rodapé
// Injeta o footer completo no <div id="footer-root">

/**
 * Inicializa o footer da página.
 * @param {string} basePath - Caminho relativo até a raiz do projeto
 */
function initFooter(basePath = '') {
    const root = document.getElementById('footer-root');
    if (!root) return;

    root.innerHTML = `
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-10 transition-colors duration-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
                <img src="${basePath}src/img/mitochondria.svg" alt="MitoTools" class="w-5 h-5" style="filter:brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(100%) contrast(97%);"> MitoTools Web
            </div>
            <p class="text-gray-400 dark:text-gray-500 text-sm">© 2026 MitoTools Web. Developed for academic research in
                bioinformatics.</p>
        </div>
    </footer>`;
}
