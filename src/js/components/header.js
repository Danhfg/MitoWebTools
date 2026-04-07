// Header Component — Injeção dinâmica do navbar
// Injeta o header completo no <div id="header-root">

/**
 * Inicializa o header com highlight na página ativa.
 * @param {string} activePage - Nome da página: 'home', 'rscu', 'synteny', 'dloop', 'about'
 * @param {string} basePath - Caminho relativo até a raiz do projeto (ex: '' para root, '../' para pages/)
 */
function initHeader(activePage, basePath = '') {
    const root = document.getElementById('header-root');
    if (!root) return;

    const navItems = [
        { id: 'home', label: 'Home', href: `${basePath}index.html` },
        { id: 'rscu', label: 'RSCU Analysis', href: `${basePath}pages/rscu.html` },
        { id: 'codon-usage', label: 'Codon Usage', href: `${basePath}pages/codon-usage.html` },
        { id: 'gene-size', label: 'Gene Size', href: `${basePath}pages/gene-size.html` },
        { id: 'kaks', label: 'Ka/Ks', href: `${basePath}pages/kaks.html` },
        { id: 'synteny', label: 'Gene Synteny', href: `${basePath}pages/synteny.html` },
        { id: 'dloop', label: 'D-Loop', href: `${basePath}pages/dloop.html` },
        { id: 'about', label: 'About', href: '#' },
    ];

    const activeClass = 'text-primary-600 dark:text-primary-400 font-medium border-b-2 border-primary-600 dark:border-primary-400 pb-1';
    const inactiveClass = 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors';

    const navLinks = navItems.map(item => {
        const cls = item.id === activePage ? activeClass : inactiveClass;
        return `<a href="${item.href}" class="${cls}">${item.label}</a>`;
    }).join('\n                ');

    root.innerHTML = `
    <header class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50 transition-colors duration-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <img src="${basePath}src/img/mitochondria.svg" alt="MitoTools" class="w-8 h-8" style="filter:brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(100%) contrast(97%);">
                <a href="${basePath}index.html"
                    class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-primary-400 dark:to-indigo-400">MitoTools
                    Web</a>
            </div>
            <nav class="hidden md:flex gap-8 items-center">
                ${navLinks}
                <!-- Dark Mode Toggle button -->
                <button id="themeToggle"
                    class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                    <i class="fa-solid fa-moon dark:hidden"></i>
                    <i class="fa-solid fa-sun hidden dark:inline-block"></i>
                </button>
            </nav>
            <div class="flex items-center gap-4 md:hidden">
                <button id="themeToggleMobile"
                    class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                    <i class="fa-solid fa-moon dark:hidden"></i>
                    <i class="fa-solid fa-sun hidden dark:inline-block"></i>
                </button>
                <button id="mobileMenuBtn" class="text-gray-500 dark:text-gray-400 text-xl cursor-pointer">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </div>
        </div>
        <!-- Mobile Menu (hidden by default) -->
        <div id="mobileMenu" class="hidden md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
            ${navItems.map(item => {
        const mCls = item.id === activePage
            ? 'block text-primary-600 dark:text-primary-400 font-medium py-2'
            : 'block text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium py-2 transition-colors';
        return `<a href="${item.href}" class="${mCls}">${item.label}</a>`;
    }).join('\n            ')}
        </div>
    </header>`;

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}
