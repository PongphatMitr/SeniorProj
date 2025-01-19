document.addEventListener('DOMContentLoaded', () => {
    let currentLang = localStorage.getItem('selectedLanguage') || 'thai';

    const toggleSwitch = document.getElementById('language-toggle');
    if (toggleSwitch) {
        toggleSwitch.checked = currentLang === 'english';

        toggleSwitch.addEventListener('change', () => {
            currentLang = toggleSwitch.checked ? 'english' : 'thai';
            localStorage.setItem('selectedLanguage', currentLang);
        });
    }
});
    