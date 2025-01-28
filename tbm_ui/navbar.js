function updateSidebar(isLoggedIn) {
    const navList = document.getElementById('navList');

    // Translations for navigation menu
    const translations = {
        thai: ['โปรไฟล์', 'หน้าหลัก', 'รายงาน', 'จัดการกิจกรรม', 'จัดการสมาชิก', 'จัดการหมวดหมู่ทักษะ', 'จัดการกองทุนชุมชน', 'จัดการชุมชน', 'ธุรกรรมทั้งหมด'],
        english: ['Profile', 'Homepage', 'Reports Overview', 'Activities Management', 'Members Management', 'Skills Management', 'Funds Management', 'Community Management', 'Transactions'],
    };

    // Get the current language from localStorage or default to 'thai'
    const currentLang = localStorage.getItem('selectedLanguage') || 'thai';
    const navItems = translations[currentLang]; // Get navigation items based on the selected language

    if (isLoggedIn) {
        navList.innerHTML = `
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="profile.html">
                    <i class="fas fa-user mr-3"></i>
                    ${navItems[0]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="homepage.html">
                    <i class="fas fa-home mr-3"></i>
                    ${navItems[1]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="report.html">
                    <i class="fas fa-chart-bar mr-3"></i>
                    ${navItems[2]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="activity.html">
                    <i class="fas fa-calendar-alt mr-3"></i>
                    ${navItems[3]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="member.html">
                    <i class="fas fa-users mr-3"></i>
                    ${navItems[4]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="skillconf.html">
                    <i class="fas fa-cogs mr-3"></i>
                    ${navItems[5]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="fund.html">
                    <i class="fas fa-hand-holding-usd mr-3"></i>
                    ${navItems[6]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="commconf.html">
                    <i class="fas fa-cog mr-3"></i>
                    ${navItems[7]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="transaction.html">
                    <i class="fas fa-exchange-alt mr-3"></i>
                    ${navItems[8]}
                </a>
            </li>
        `;
    } else {
        navList.innerHTML = `
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="login.html">
                    <i class="fas fa-sign-in-alt mr-3"></i>
                    ${currentLang === 'thai' ? 'เข้าสู่ระบบ' : 'Login'}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="homepage.html">
                    <i class="fas fa-home mr-3"></i>
                    ${navItems[1]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="report.html">
                    <i class="fas fa-chart-bar mr-3"></i>
                    ${navItems[2]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="activity.html">
                    <i class="fas fa-calendar-alt mr-3"></i>
                    ${navItems[3]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="member.html">
                    <i class="fas fa-users mr-3"></i>
                    ${navItems[4]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="skillconf.html">
                    <i class="fas fa-cogs mr-3"></i>
                    ${navItems[5]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="fund.html">
                    <i class="fas fa-hand-holding-usd mr-3"></i>
                    ${navItems[6]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="commconf.html">
                    <i class="fas fa-cog mr-3"></i>
                    ${navItems[7]}
                </a>
            </li>
            <li class="mb-5">
                <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300"
                    href="transaction.html">
                    <i class="fas fa-exchange-alt mr-3"></i>
                    ${navItems[8]}
                </a>
            </li>
        `;
    }
}

async function checkLoginStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch('http://localhost:3000/api/tbm/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                updateSidebar(true);
            } else {
                localStorage.removeItem('token');
                updateSidebar(false);
                const goToLogin = confirm('Session expired. Do you want to go to the login page?');
                if (goToLogin) {
                    window.location.href = 'login.html';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            localStorage.removeItem('token');
            updateSidebar(false);
            const goToLogin = confirm('An error occurred. Do you want to go to the login page?');
            if (goToLogin) {
                window.location.href = 'login.html';
            }
        }
    } else {
        updateSidebar(false);
        const goToLogin = confirm('You are not logged in. Do you want to go to the login page?');
        if (goToLogin) {
            window.location.href = 'login.html';
        }
    }
}