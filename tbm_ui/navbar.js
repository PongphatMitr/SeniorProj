async function updateSidebar(isLoggedIn) {
    const navList = document.getElementById('navList');
    const translations = {
        thai: [
            'โปรไฟล์',
            'แจ้งเตือน',
            'หน้าหลัก',
            'รายงาน',
            'จัดการกิจกรรม',
            'จัดการสมาชิก',
            'จัดการหมวดหมู่ทักษะ',
            'จัดการกองทุนชุมชน',
            'จัดการชุมชน',
            'ธุรกรรมทั้งหมด',
            'ความคิดเห็น',
        ],
        english: [
            'Profile',
            'Notifications',
            'Homepage',
            'Reports Overview',
            'Activities Management',
            'Members Management',
            'Skills Management',
            'Funds Management',
            'Community Management',
            'Transactions',
            'Feedback',
        ],
    };
    const currentLang = localStorage.getItem('selectedLanguage') || 'thai';
    const navItems = translations[currentLang];
    const sidebarHeader = `
    <div class="flex items-center mb-10">
      <img alt="Logo of Time Bank System, a clock with a handshake in the center" class="w-10 h-10 rounded-full" height="50" src="../images/timebank.png" width="50" />
      <span class="ml-3 text-xl font-bold text-blue-600"> TIMEBANK </span>
    </div>
  `;

    async function fetchNotifications() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return [];

            // Fetch user profile
            const profileResponse = await fetch('http://localhost:3000/api/tbm/auth/profile', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!profileResponse.ok) {
                console.error('Profile fetch failed with status:', profileResponse.status);
                return [];
            }
            const profileData = await profileResponse.json();

            const userId = profileData.user_id ?? profileData.userId ?? profileData.id;
            if (!userId) {
                console.error('User ID not found in profile data');
                return [];
            }

            // Fetch member skills
            const skillsResponse = await fetch(`http://localhost:3000/api/tbm/members/${userId}/skills`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!skillsResponse.ok) {
                console.error('Skills fetch failed with status:', skillsResponse.status);
                return [];
            }
            const skillsData = await skillsResponse.json();

            let userSkills = [];
            if (Array.isArray(skillsData.skills)) {
                userSkills = skillsData.skills
                    .filter(s => s.skill_id !== null && s.skill_id !== undefined)
                    .map(s => s.skill_id);
            } else {
                console.warn('Unexpected skills data format:', skillsData);
            }

            // Fetch all activities
            const activitiesResponse = await fetch('http://localhost:3000/api/tbm/activities', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!activitiesResponse.ok) {
                console.error('Activities fetch failed with status:', activitiesResponse.status);
                return [];
            }
            const activitiesData = await activitiesResponse.json();

            // activitiesData has structure: { activities: { date1: [...], date2: [...] }, total: n }
            // Flatten all activities arrays into one array
            let activities = [];
            if (
                activitiesData &&
                typeof activitiesData === 'object' &&
                activitiesData.activities &&
                typeof activitiesData.activities === 'object'
            ) {
                for (const dateKey in activitiesData.activities) {
                    if (Array.isArray(activitiesData.activities[dateKey])) {
                        activities = activities.concat(activitiesData.activities[dateKey]);
                    }
                }
            } else if (Array.isArray(activitiesData)) {
                activities = activitiesData;
            } else {
                console.warn('Unexpected activities data format:', activitiesData);
                return [];
            }

            // Filter activities that require skills user has and requester is not the user
            const filteredActivities = activities.filter(activity => {
                if (activity.required_skills === null || activity.required_skills === undefined) return false;
                const hasSkill = userSkills.includes(activity.required_skills);
                return hasSkill && activity.requester_id !== userId;
            });

            // Map to notification objects
            const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
            const notifications = filteredActivities.map(activity => ({
                id: activity.activity_id,
                text: currentLang === 'thai' ? `คุณมีคำขอกิจกรรมใหม่` : `New activity request`,
                read: readNotifications.includes(activity.activity_id),
            }));


            return notifications;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }

    function renderNotificationItems(notifications) {
        return notifications
            .map(n => `
            <li class="flex justify-between items-center px-4 py-3 cursor-pointer border-b ${n.read
                    ? 'bg-white text-gray-700'
                    : 'border-l-4 border-yellow-400 bg-yellow-50 text-black font-semibold'}"
                data-id="${n.id}" data-read="${n.read}">
                <div class="flex flex-col">
                    <span>${n.text}</span>
                </div>
                <span class="text-sm text-gray-500">${new Date().toLocaleDateString('th-TH')}</span>
            </li>
        `)
            .join('') + `<li class="px-4 py-3 text-center text-blue-600 hover:underline cursor-pointer">ดูการแจ้งเตือนทั้งหมด</li>`;
    }


    function markNotificationAsRead(id) {
        const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
        if (!readNotifications.includes(id)) {
            readNotifications.push(id);
            localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
        }
    }

    async function renderSidebar() {
        if (isLoggedIn) {
            const notifications = await fetchNotifications();
            const unreadCount = notifications.filter(n => !n.read).length;
            const notificationItemsHTML = renderNotificationItems(notifications);

            navList.innerHTML = `
        ${sidebarHeader}
        <li class="mb-5 flex items-center justify-between relative">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="profile.html">
            <i class="fas fa-user mr-3"></i> ${navItems[0]}
          </a>
          <button class="text-red-600 hover:text-red-800 p-2 rounded transition duration-300" onclick="showLogoutModal()" aria-label="Logout">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </li>
        <li class="mb-5 relative" id="notification-dropdown-container">
          <button id="notification-button" aria-haspopup="true" aria-expanded="false" class="flex items-center w-full text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <i class="fas fa-bell mr-3"></i>
            <span>${navItems[1]}</span>
            ${unreadCount > 0
                    ? `<span id="notification-badge" class="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">${unreadCount}</span>`
                    : ''
                }
            <i class="fas fa-chevron-down ml-auto"></i>
          </button>
          <ul id="notification-dropdown"
    class="absolute left-0 top-full mt-2 w-80 max-h-[350px] overflow-y-auto bg-white border border-gray-300 rounded shadow-2xl z-[9999] hidden"
    role="menu"
    aria-label="Notifications">

            ${notificationItemsHTML}
          </ul>
        </li>
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="homepage.html">
            <i class="fas fa-home mr-3"></i> ${navItems[2]}
          </a>
        </li>
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="report.html">
            <i class="fas fa-chart-bar mr-3"></i> ${navItems[3]}
          </a>
        </li>
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="activity.html">
            <i class="fas fa-calendar-alt mr-3"></i> ${navItems[4]}
          </a>
        </li>
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="member.html">
            <i class="fas fa-users mr-3"></i> ${navItems[5]}
          </a>
        </li>
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="skillconf.html">
            <i class="fas fa-cogs mr-3"></i> ${navItems[6]}
          </a>
        </li>
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="fund.html">
            <i class="fas fa-hand-holding-usd mr-3"></i> ${navItems[7]}
          </a>
        </li>
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="commconf.html">
            <i class="fas fa-cog mr-3"></i> ${navItems[8]}
          </a>
        </li>
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="transaction.html">
            <i class="fas fa-exchange-alt mr-3"></i> ${navItems[9]}
          </a>
        </li>
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="feedback.html">
            <i class="fas fa-comment-dots mr-3"></i> ${navItems[10]}
          </a>
        </li>
      `;

            const notificationButton = document.getElementById('notification-button');
            const notificationDropdown = document.getElementById('notification-dropdown');
            if (notificationButton && notificationDropdown) {
                notificationButton.addEventListener('click', () => {
                    const isExpanded = notificationButton.getAttribute('aria-expanded') === 'true';
                    if (isExpanded) {
                        notificationDropdown.classList.add('hidden');
                        notificationButton.setAttribute('aria-expanded', 'false');
                    } else {
                        notificationDropdown.classList.remove('hidden');
                        notificationButton.setAttribute('aria-expanded', 'true');
                    }
                });

                const notificationItems = notificationDropdown.querySelectorAll('li');
                notificationItems.forEach(item => {
                    item.addEventListener('click', () => {
                        const notifId = parseInt(item.getAttribute('data-id'));
                        const alreadyRead = item.getAttribute('data-read') === 'true';

                        if (!alreadyRead) {
                            item.classList.remove('border-l-4', 'border-yellow-400', 'bg-yellow-50', 'font-semibold');
                            item.classList.add('bg-white', 'text-gray-700');
                            item.setAttribute('data-read', 'true');
                            markNotificationAsRead(notifId);

                            const badge = document.getElementById('notification-badge');
                            if (badge) {
                                let count = parseInt(badge.textContent, 10);
                                count = count > 0 ? count - 1 : 0;
                                if (count === 0) {
                                    badge.remove();
                                } else {
                                    badge.textContent = count;
                                }
                            }
                        }
                    });
                });

                document.addEventListener('click', e => {
                    if (!notificationButton.contains(e.target) && !notificationDropdown.contains(e.target)) {
                        notificationDropdown.classList.add('hidden');
                        notificationButton.setAttribute('aria-expanded', 'false');
                    }
                });
            }
        } else {
            navList.innerHTML = `
        ${sidebarHeader}
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="login.html">
            <i class="fas fa-sign-in-alt mr-3"></i> ${currentLang === 'thai' ? 'เข้าสู่ระบบ' : 'Login'}
          </a>
        </li>
        <li class="mb-5">
          <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="homepage.html">
            <i class="fas fa-home mr-3"></i> ${navItems[2]}
          </a>
        </li>
      `;
        }
    }

    await renderSidebar();
}

async function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const isRegisterPage = window.location.pathname.endsWith('register.html');
    if (token) {
        try {
            const response = await fetch('http://localhost:3000/api/tbm/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                await updateSidebar(true);
            } else {
                localStorage.removeItem('token');
                await updateSidebar(false);
                if (!isLoginPage && !isRegisterPage) {
                    showErrorModal('Token verification failed. Redirecting to login page.');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            localStorage.removeItem('token');
            await updateSidebar(false);
            if (!isLoginPage && !isRegisterPage) {
                showErrorModal('Error occurred during token verification. Redirecting to login page.');
            }
        }
    } else {
        await updateSidebar(false);
        if (!isLoginPage && !isRegisterPage) {
            showErrorModal('No token found. Redirecting to login page.');
        }
    }
}

function showLogoutModal() {
    const logoutModal = document.getElementById('logout-modal');
    if (logoutModal) {
        logoutModal.classList.remove('hidden');
    } else {
        console.error('Logout modal element not found.');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('profileData');
    window.location.href = 'login.html';
}

function showErrorModal(message) {
    const errorModal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    if (errorModal && errorMessage) {
        errorMessage.textContent = message;
        errorModal.classList.remove('hidden');
    } else {
        console.error('Error modal or message element not found.');
    }
}

document.addEventListener('DOMContentLoaded', checkLoginStatus);

document.addEventListener('DOMContentLoaded', () => {
    const body = document.querySelector('body');
    const logoutModalHTML = `
    <div id="logout-modal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden z-50">
      <div class="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg text-center">
        <div class="flex justify-center">
          <div class="w-20 h-20 flex items-center justify-center rounded-full bg-yellow-100 border-4 border-yellow-500">
            <svg class="w-12 h-12 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
          </div>
        </div>
        <h2 class="text-3xl font-bold text-yellow-600 mt-6">คุณต้องการออกจากระบบ?</h2>
        <p class="text-gray-700 text-lg mt-4">หากคุณออกจากระบบ คุณจะต้องเข้าสู่ระบบอีกครั้ง</p>
        <div class="flex justify-center gap-4 mt-6">
          <button id="logout-confirm-btn" class="px-6 py-3 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition duration-300"> ออกจากระบบ </button>
          <button id="logout-cancel-btn" class="px-6 py-3 bg-gray-300 text-gray-800 text-lg font-semibold rounded-lg hover:bg-gray-400 transition duration-300"> ยกเลิก </button>
        </div>
      </div>
    </div>
  `;
    const errorModalHTML = `
    <div id="error-modal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden z-50">
      <div class="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg text-center">
        <div class="flex justify-center">
          <div class="w-20 h-20 flex items-center justify-center rounded-full bg-red-100 border-4 border-red-500">
            <svg class="w-12 h-12 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        <h2 class="text-3xl font-bold text-red-600 mt-6">เกิดข้อผิดพลาด!</h2>
        <p class="text-gray-700 text-lg mt-4" id="error-message">ไม่สามารถเข้าสู่ระบบได้</p>
        <button id="error-confirm-btn" class="mt-6 px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition duration-300"> ตกลง </button>
      </div>
    </div>
  `;
    if (body) {
        body.insertAdjacentHTML('beforeend', logoutModalHTML);
        body.insertAdjacentHTML('beforeend', errorModalHTML);
    }
    const logoutConfirmBtn = document.getElementById('logout-confirm-btn');
    const logoutCancelBtn = document.getElementById('logout-cancel-btn');
    const logoutModal = document.getElementById('logout-modal');
    const errorConfirmBtn = document.getElementById('error-confirm-btn');
    const errorModal = document.getElementById('error-modal');
    if (logoutConfirmBtn && logoutModal) {
        logoutConfirmBtn.addEventListener('click', logout);
        if (logoutCancelBtn) {
            logoutCancelBtn.addEventListener('click', () => {
                logoutModal.classList.add('hidden');
            });
        }
    } else {
        console.error('Logout confirmation or modal elements not found.');
    }
    if (errorConfirmBtn && errorModal) {
        errorConfirmBtn.addEventListener('click', () => {
            errorModal.classList.add('hidden');
            window.location.href = 'login.html';
        });
    } else {
        console.error('Error confirmation or modal elements not found.');
    }
});