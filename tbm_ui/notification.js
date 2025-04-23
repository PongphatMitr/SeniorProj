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
                    id: act.activity_id,
                    status: act.status,
                    text: (currentLang === 'thai'
                        ? `<strong>กิจกรรมสถานะ:</strong> <span class="text-white px-2 py-0.5 rounded text-sm mr-1 ${statusColor[act.status] || 'bg-gray-500'}">${act.status}</span> - ${act.title}`
                        : `<strong>Activity Status:</strong> <span class="text-white px-2 py-0.5 rounded text-sm ${statusColor[act.status] || 'bg-gray-500'}">${act.status}</span> - ${act.title}`),
                    read: read.includes(act.activity_id),
                    created_at: act.created_at || act.start_date
                }));

            const configRes = await fetch('http://localhost:3000/api/tbm/community-config/logs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!configRes.ok) return activityNotifs;
            const configData = await configRes.json();
            const configNotifs = configData.logs.map(log => ({
                id: `config-${log.log_id}`,
                status: 'community_config',
                text: (currentLang === 'thai'
                    ? `<strong>ตั้งค่าชุมชน:</strong> ${log.change_description} โดยผู้ใช้ ID ${log.changed_by}`
                    : `<strong>Community Config:</strong> ${log.change_description} by user ID ${log.changed_by}`),
                read: read.includes(`config-${log.log_id}`),
                created_at: log.changed_at
            }));

            return [...activityNotifs, ...configNotifs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (err) {
            console.error('Notification fetch error:', err);
            return [];
        }
    }

    async function renderNotificationsToContainer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const toggleId = 'notif-toggle-btn';
        const dropdownId = 'notif-dropdown';

        // Ensure toggle button and dropdown exist
        let toggleBtn = document.getElementById(toggleId);
        let dropdown = document.getElementById(dropdownId);

        if (!toggleBtn || !dropdown) {
            container.innerHTML = `
                <button id="${toggleId}" class="bg-white text-blue-600 px-4 py-4 rounded shadow font-semibold" aria-haspopup="true" aria-expanded="false" aria-controls="${dropdownId}" aria-label="Toggle notifications">
                    <i class="fas fa-bell text-md"></i>
                </button>
                <ul id="${dropdownId}" class="absolute right-0 mt-2 hidden max-h-[500px] overflow-y-auto bg-white text-black border border-gray-200 rounded-lg shadow-xl w-[500px] z-50" role="menu" aria-labelledby="${toggleId}" tabindex="-1"></ul>
            `;
            toggleBtn = document.getElementById(toggleId);
            dropdown = document.getElementById(dropdownId);
        }

        const notifications = await fetchNotificationsOnly();

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
                <li class="font-semibold text-gray-600 mt-3 px-4 select-none">${title}</li>
                ${items.map(n => `
                <li tabindex="0" class="px-4 py-2 border-b hover:bg-blue-50 cursor-pointer ${n.read ? 'text-gray-500 bg-white' : 'bg-yellow-50 font-semibold'}"
                    onclick="markNotificationAsRead('${n.id}'); this.classList.remove('font-semibold'); this.classList.remove('bg-yellow-50'); this.classList.add('text-gray-500'); this.classList.add('bg-white');"
                    onkeydown="if(event.key==='Enter' || event.key===' ') { event.preventDefault(); this.click(); }" role="menuitem" aria-label="Notification: ${n.text.replace(/<[^>]*>?/gm, '')}">
                    ${n.text}<br />
                    <small class="text-sm text-gray-400">${n.timeString}</small>
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

        // Add toggle button event to show/hide dropdown
        toggleBtn.onclick = () => {
            const isHidden = dropdown.classList.contains('hidden');
            if (isHidden) {
                dropdown.classList.remove('hidden');
                toggleBtn.setAttribute('aria-expanded', 'true');
            } else {
                dropdown.classList.add('hidden');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!container.contains(event.target)) {
                dropdown.classList.add('hidden');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function markNotificationAsRead(id) {
        const read = JSON.parse(localStorage.getItem('readNotifications') || '[]');
        if (!read.includes(id)) {
            read.push(id);
            localStorage.setItem('readNotifications', JSON.stringify(read));
        }
    }

    window.renderNotificationsToContainer = renderNotificationsToContainer;
}