// Connect to Socket.IO
const socket = io('http://localhost:3000'); // Make sure port matches your backend
socket.on('connect', () => {
    console.log('🟢 Connected to Socket.IO');
});

// Listen for config updates from the server
socket.on('configUpdated', () => {
    console.log('⚡ Received configUpdated from server');
    if (typeof window.renderNotificationsToContainer === 'function') {
        window.renderNotificationsToContainer('mainNotificationPanel');
    }
});

if (!window.__notificationInitialized) {
    window.__notificationInitialized = true;

    let hasViewedAllNotifications = false;

    async function fetchNotificationsOnly() {
        const token = localStorage.getItem('token');
        if (!token) return [];

        const statusColor = {
            'กำลังจะเริ่ม': 'bg-blue-500',
            'กำลังทำกิจกรรม': 'bg-yellow-500',
            'รอผู้ขอยืนยันผล': 'bg-pink-500',
            'รอการอนุมัติ': 'bg-indigo-500',
            'เสร็จสิ้น': 'bg-green-500',
            'เกินเวลา': 'bg-orange-500',
            'ยกเลิก': 'bg-red-600',
            'ผู้เข้าร่วมไม่ครบ': 'bg-rose-500'
        };

        try {
            const currentLang = localStorage.getItem('selectedLanguage') || 'thai';

            const profileRes = await fetch('http://localhost:3000/api/tbm/auth/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!profileRes.ok) return [];
            const profile = await profileRes.json();
            const userId = profile.user_id || profile.userId || profile.id;

            const skillRes = await fetch(`http://localhost:3000/api/tbm/members/${userId}/skills`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!skillRes.ok) return [];
            const skillData = await skillRes.json();
            const userSkills = (skillData.skills || []).map(s => s.skill_id);

            const actRes = await fetch('http://localhost:3000/api/tbm/activities', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!actRes.ok) return [];
            const actData = await actRes.json();

            let allActivities = [];
            if (actData.activities) {
                for (const dateKey in actData.activities) {
                    if (Array.isArray(actData.activities[dateKey])) {
                        allActivities = allActivities.concat(actData.activities[dateKey]);
                    }
                }
            } else {
                allActivities = actData;
            }

            const read = JSON.parse(localStorage.getItem('readNotifications') || '[]');

            const activityNotifs = allActivities
                .filter(act => userSkills.includes(act.required_skills) && act.requester_id !== userId)
                .map(act => ({
                    id: `activity-${act.activity_id}`,
                    status: act.status,
                    text: (currentLang === 'thai'
                        ? `<div class="mb-1 font-bold">${act.title}</div><div>สถานะกิจกรรม: <span class="text-white px-2 py-0.5 rounded text-sm ${statusColor[act.status] || 'bg-gray-500'}">${act.status}</span></div>`
                        : `<div class="mb-1 font-bold">${act.title}</div><div>Activity Status: <span class="text-white px-2 py-0.5 rounded-3xl text-sm ${statusColor[act.status] || 'bg-gray-500'}">${act.status}</span></div>`),
                    created_at: act.created_at || act.start_date
                }));

            const configRes = await fetch('http://localhost:3000/api/tbm/community-config/logs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!configRes.ok) return activityNotifs;
            const configData = await configRes.json();
            const configNotifs = configData.logs.map(log => {
                const details = log.changed_fields // assume this is an object like { max_tokens: 10, expire_days: 30 }
                    ? Object.entries(log.changed_fields)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ')
                    : log.change_description;

                return {
                    id: `config-${log.log_id}`,
                    status: 'community_config',
                    text: (currentLang === 'thai'
                        ? `<strong>ตั้งค่าชุมชน:</strong> ${details} โดยผู้ใช้ ID ${log.changed_by}`
                        : `<strong>Community Config:</strong> ${details} by user ID ${log.changed_by}`),
                    created_at: log.changed_at
                };
            });


            return [...activityNotifs, ...configNotifs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (err) {
            console.error('Notification fetch error:', err);
            return [];
        }
    }

    async function renderNotificationsToContainer(containerId = 'mainNotificationPanel') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const toggleId = 'notif-toggle-btn';
        const dropdownId = 'notif-dropdown';

        // Ensure toggle button and dropdown exist
        let toggleBtn = document.getElementById(toggleId);
        let dropdown = document.getElementById(dropdownId);

        // 🛠 If missing, inject them
        if (!toggleBtn || !dropdown) {
            container.innerHTML = `
        <button id="${toggleId}" class="bg-white text-blue-600 px-4 py-4 rounded-2xl shadow font-semibold relative" aria-haspopup="true" aria-expanded="false" aria-controls="${dropdownId}" aria-label="Toggle notifications">
            <i class="fas fa-bell text-md"></i>
            <span id="notif-badge" class="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center hidden">0</span>
        </button>
        <ul id="${dropdownId}" class="absolute right-0 mt-2 hidden max-h-[500px] overflow-y-auto bg-white text-black border border-gray-200 rounded-lg shadow-xl w-[500px] z-50" role="menu" aria-labelledby="${toggleId}" tabindex="-1"></ul>
    `;
            toggleBtn = document.getElementById(toggleId);
            dropdown = document.getElementById(dropdownId);
            toggleBtn.addEventListener('click', toggleDropdown);
        }

        function toggleDropdown() {
            const isHidden = dropdown.classList.contains('hidden');
            if (isHidden) {
                dropdown.classList.remove('hidden');
                toggleBtn.setAttribute('aria-expanded', 'true');
            } else {
                dropdown.classList.add('hidden');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        }

        function handleClickOutside(event) {
            if (!container.contains(event.target)) {
                dropdown.classList.add('hidden');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        }

        if (!toggleBtn || !dropdown) {
            container.innerHTML = `
        <button id="${toggleId}" class="bg-white text-blue-600 px-4 py-4 rounded-2xl shadow font-semibold relative" aria-haspopup="true" aria-expanded="false" aria-controls="${dropdownId}" aria-label="Toggle notifications">
            <i class="fas fa-bell text-md"></i>
            <span id="notif-badge" class="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center hidden">0</span>
        </button>
        <ul id="${dropdownId}" class="absolute right-0 mt-2 hidden max-h-[500px] overflow-y-auto bg-white text-black border border-gray-200 rounded-lg shadow-xl w-[500px] z-50" role="menu" aria-labelledby="${toggleId}" tabindex="-1"></ul>
    `;

            // 🛠 Re-query the elements after insertion
            toggleBtn = document.getElementById(toggleId);
            dropdown = document.getElementById(dropdownId);
        }


        const notifications = await fetchNotificationsOnly();
        let read = JSON.parse(localStorage.getItem('readNotifications') || '[]');

        // Remove from read any notification IDs that no longer exist in notifications (clean up)
        const notificationIds = notifications.map(n => n.id);
        read = read.filter(id => notificationIds.includes(id));
        localStorage.setItem('readNotifications', JSON.stringify(read));

        // Mark new notifications as unread by ensuring they are NOT in read array
        // So do NOT add new notification IDs to read automatically

        const unreadCount = notifications.filter(n => !read.includes(n.id)).length;
        const badge = document.getElementById('notif-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        const today = new Date().toLocaleDateString('th-TH');
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('th-TH');

        const grouped = { 'วันนี้': [], 'เมื่อวาน': [], other: {} };

        notifications.forEach(n => {
            const date = new Date(n.created_at).toLocaleDateString('th-TH');
            const time = new Date(n.created_at).toLocaleTimeString('th-TH', {
                hour: '2-digit', minute: '2-digit', hour12: false
            });

            const enriched = { ...n, dateString: date, timeString: time };

            if (date === today) grouped['วันนี้'].push(enriched);
            else if (date === yesterday) grouped['เมื่อวาน'].push(enriched);
            else {
                if (!grouped.other[date]) grouped.other[date] = [];
                grouped.other[date].push(enriched);
            }
        });

        function renderGroup(title, items) {
            if (items.length === 0) return '';
            return `
        <li class="text-gray-500 text-sm font-semibold px-4 pt-3 select-none">${title}</li>
        ${items.map(n => `
        <li tabindex="0" data-id="${n.id}"
            class="bg-white ${read.includes(n.id) ? 'text-gray-500' : 'bg-yellow-50 font-semibold'} hover:bg-gray-100 p-4 rounded-xl cursor-pointer transition flex items-start gap-3"
            onclick="markNotificationAsRead('${n.id}')"
            onkeydown="if(event.key==='Enter' || event.key===' ') { event.preventDefault(); this.click(); }"
            role="menuitem"
            aria-label="Notification: ${n.text.replace(/<[^>]*>?/gm, '')}">

            <div class="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 text-lg">
    <i class="${n.status === 'community_config' ? 'fas fa-cog' : 'fas fa-calendar-alt'}"></i>
</div>

            <div class="flex-1">
                <div class="flex flex-col">
    <div class="flex items-start">
        <span class="text-gray-400 text-xs mr-4 mt-0.5">${n.timeString}</span>
        <div class="text-sm leading-snug">${n.text}</div>
    </div>
</div>
            </div>
        </li>`).join('')}
    `;
        }

        let html = '';
        html += renderGroup('วันนี้', grouped['วันนี้']);
        html += renderGroup('เมื่อวาน', grouped['เมื่อวาน']);
        for (const date in grouped.other) {
            html += renderGroup(date, grouped.other[date]);
        }

        if (html.trim() === '') {
            html = `<li class="px-4 py-2 text-gray-500 select-none">ไม่มีการแจ้งเตือน</li>`;
        }

        dropdown.innerHTML = html;

        // Notification toggle and rendering logic
        const notifToggleBtn = document.getElementById('notif-toggle-btn');
        const notifDropdown = document.getElementById('notif-dropdown');

        document.addEventListener('click', handleClickOutside);

        // Keyboard accessibility for notification toggle
        notifToggleBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                notifDropdown.classList.add('hidden');
                notifToggleBtn.setAttribute('aria-expanded', 'false');
                notifToggleBtn.focus();
            }
            if (e.key === 'ArrowDown' && notifDropdown.classList.contains('hidden')) {
                e.preventDefault();
                toggleDropdown();
                // Focus first notification item if exists
                const firstItem = notifDropdown.querySelector('li:not(.font-semibold)');
                if (firstItem) firstItem.focus();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!container.contains(event.target)) {
                dropdown.classList.add('hidden');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        });
        toggleBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.classList.add('hidden');
                toggleBtn.setAttribute('aria-expanded', 'false');
                toggleBtn.focus();
            }
            if (e.key === 'ArrowDown' && dropdown.classList.contains('hidden')) {
                e.preventDefault();
                dropdown.classList.remove('hidden');
                toggleBtn.setAttribute('aria-expanded', 'true');
                const firstItem = dropdown.querySelector('li[tabindex="0"]');
                if (firstItem) firstItem.focus();
            }
        });
    }

    window.renderNotificationsToContainer = renderNotificationsToContainer;

    function markNotificationAsRead(id) {
        const read = JSON.parse(localStorage.getItem('readNotifications') || '[]');
        if (!read.includes(id)) {
            read.push(id);
            localStorage.setItem('readNotifications', JSON.stringify(read));
        }
        if (typeof window.renderNotificationsToContainer === 'function') {
            window.renderNotificationsToContainer('mainNotificationPanel');
        }
    }

    window.renderNotificationsToSidebar = function (containerId = "notificationSidebarContainer") {

        window.dispatchNotificationRefresh = function () {
            if (typeof window.renderNotificationsToContainer === 'function') {
                window.renderNotificationsToContainer('mainNotificationPanel');
            }
        };

        renderNotificationsToContainer(containerId);
    };
    document.addEventListener('DOMContentLoaded', () => {
        const panel = document.getElementById('mainNotificationPanel');
        if (!panel) {
            const navList = document.getElementById('navList');
            const notifWrapper = document.createElement('div');
            notifWrapper.id = 'mainNotificationPanel';
            notifWrapper.className = 'relative mb-4';
            navList?.parentElement?.insertBefore(notifWrapper, navList);
        }

        if (typeof window.renderNotificationsToContainer === 'function') {
            window.renderNotificationsToContainer('mainNotificationPanel');
        }

    });
}