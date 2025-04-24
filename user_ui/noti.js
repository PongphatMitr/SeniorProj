function injectNotificationUI() {
    const bellContainer = document.createElement('div');
    bellContainer.className = 'absolute right-0 top-0 mr-4';
    bellContainer.innerHTML = `
        <button id="notification-bell" class="relative focus:outline-none" aria-label="เปิด/ปิด การแจ้งเตือน" aria-haspopup="true" aria-expanded="false">
            <i class="fas fa-bell text-white text-2xl"></i>
            <span id="notification-count"
                  class="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1 hidden">0</span>
        </button>
        <div id="notification-panel"
             class="hidden absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto ring-1 ring-black ring-opacity-5">
            <div class="p-4 border-b font-semibold text-gray-700 flex justify-between items-center">
                <span>การแจ้งเตือน</span>
                <button id="clear-notifications" class="text-sm text-red-600 hover:underline focus:outline-none">ล้างทั้งหมด</button>
            </div>
            <ul id="notification-list" class="divide-y divide-gray-200"></ul>
            <div id="no-notifications" class="p-4 text-center text-gray-500 italic hidden">ไม่มีการแจ้งเตือนใหม่</div>
        </div>
    `;

    const headerBar = document.querySelector('.relative.mb-10');
    if (headerBar) {
        headerBar.appendChild(bellContainer);
    } else {
        console.warn("⚠️ Notification container not found");
    }
}

let notifications = [];
let lastActivityStates = new Map();
let userId = null;
let token = null;

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

function formatDateTime(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear() + 543;
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${minute} น.`;
}

function formatRelativeTime(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const mins = Math.floor(diffMs / (60 * 1000));
    if (mins < 1) return 'เมื่อสักครู่';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    const days = Math.floor(hours / 24);
    return `${days} วันที่แล้ว`;
}

function formatOffset(ms) {
    const mins = Math.floor(ms / (60 * 1000));
    if (mins >= 60 * 24) {
        const days = Math.floor(mins / (60 * 24));
        return `${days} วัน`;
    } else if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        return `${hours} ชั่วโมง`;
    } else {
        return `${mins} นาที`;
    }
}

function isSameDateTime(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return new Date(a).getTime() === new Date(b).getTime();
}

function addNotification(activity, prevStatus = null) {
    const resolvedStatus = resolveStatusMapping(prevStatus || activity.status, activity.status);

    if (resolvedStatus === 'กำลังจะเริ่ม') {
        const reminders = generateUpcomingReminders(activity);
        reminders.forEach(reminder => addNotificationInternal(reminder));
    } else if (resolvedStatus === 'กำลังทำกิจกรรม') {
        const notif = generateOngoingNotification(activity, prevStatus || activity.status);
        addNotificationInternal(notif);
    } else if (resolvedStatus === 'รอผู้ขอยืนยันผล') {
        if (activity.requester_id === userId) {
            const notifs = generateWaitConfirmRequesterNotification(activity, prevStatus || activity.status);
            notifs.forEach(n => addNotificationInternal(n));
        } else {
            const notif = generateWaitConfirmParticipantNotification(activity, prevStatus || activity.status);
            addNotificationInternal(notif);
        }
    } else if (resolvedStatus === 'รอการอนุมัติ') {
        const notif = generateWaitApprovalNotification(activity, prevStatus || activity.status);
        addNotificationInternal(notif);
    } else if (resolvedStatus === 'เสร็จสิ้น') {
        const notif = generateCompletedNotification(activity, prevStatus || activity.status);
        addNotificationInternal(notif);
    } else if (resolvedStatus === 'ผู้เข้าร่วมไม่ครบ') {
        const notif = generateInsufficientParticipantsNotification(activity, prevStatus || activity.status);
        addNotificationInternal(notif);
    } else if (resolvedStatus === 'เกินเวลา') {
        const notif = generateOverdueNotification(activity, prevStatus || activity.status);
        addNotificationInternal(notif);
    } else if (resolvedStatus === 'ยกเลิก') {
        const notif = generateCancelledNotification(activity, prevStatus || activity.status);
        addNotificationInternal(notif);
    }
}

function addNotificationInternal(newNotif) {
    const key = `${newNotif.activity_id || 'none'}|${newNotif.type}|${newNotif.timestamp}|${newNotif.extraKey || ''}`;
    if (!notifications.some(n => n._key === key)) {
        newNotif._key = key;
        notifications.unshift(newNotif);

        const popupStatuses = ['รอผู้ขอยืนยันผล', 'กำลังทำกิจกรรม'];
        if (popupStatuses.includes(newNotif.status)) {
            showRealTimePopup(newNotif);
        }
    }
}

function showRealTimePopup(notif) {
    const container = document.createElement('div');
    container.className = 'fixed bottom-4 right-4 z-50 w-80 bg-white shadow-xl rounded-lg border-l-4 p-4 flex flex-col animate-slide-in';
    container.style.borderColor = notif.colorClass.includes('bg-') ? getTailwindColor(notif.colorClass) : '#4B5563';

    container.innerHTML = `
        <div class="font-semibold text-gray-800 mb-1">${notif.title}</div>
        <div class="text-sm text-gray-600 mb-2">${typeof notif.message === 'string' ? notif.message.replace(/\n/g, '<br>') : ''}</div>
        <div class="text-xs text-gray-400 text-right">${formatRelativeTime(notif.timestamp)}</div>
    `;

    document.body.appendChild(container);

    setTimeout(() => {
        container.classList.add('opacity-0');
        container.classList.remove('animate-slide-in');
        setTimeout(() => container.remove(), 1000);
    }, 6000);
}

function getTailwindColor(colorClass) {
    const map = {
        'bg-blue-500': '#3B82F6',
        'bg-yellow-500': '#F59E0B',
        'bg-pink-500': '#EC4899',
        'bg-indigo-500': '#6366F1',
        'bg-green-500': '#10B981',
        'bg-orange-500': '#F97316',
        'bg-red-600': '#DC2626',
        'bg-rose-500': '#F43F5E',
        'bg-gray-500': '#6B7280',
        'bg-gray-400': '#9CA3AF'
    };
    return map[colorClass] || '#6B7280';
}

function removeOldNotifications(activity_id, type) {
    notifications = notifications.filter(n => !(n.activity_id === activity_id && n.type === type));
}

function formatActivityDuration(startDate, startTime, endDate, endTime) {
    const daysThai = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const monthsThai = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const start = new Date(`${startDate}T${startTime || '00:00:00'}`);
    const end = new Date(`${endDate}T${endTime || '23:59:59'}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'เวลาผิดพลาด';

    const startDayName = daysThai[start.getDay()];
    const startMonthName = monthsThai[start.getMonth()];
    const startStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} น. วัน${startDayName} ที่ ${start.getDate()} ${startMonthName} ${start.getFullYear() + 543}`;

    const endDayName = daysThai[end.getDay()];
    const endMonthName = monthsThai[end.getMonth()];
    const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')} น. วัน${endDayName} ที่ ${end.getDate()} ${endMonthName} ${end.getFullYear() + 543}`;

    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
    const durationStr = minutes > 0 ? `${hours} ชม. ${minutes} นาที` : `${hours} ชม.`;

    return `${startStr} - ${endStr} (${durationStr})`;
}

function generateUpcomingReminders(activity) {
    const reminders = [];
    if (activity.status !== 'กำลังจะเริ่ม') return reminders;

    const now = new Date();
    const startDateTime = new Date(`${activity.start_date}T${activity.start_time || '00:00:00'}`);
    const endDateTime = new Date(`${activity.end_date}T${activity.end_time || '23:59:59'}`);

    const notifyOffsets = [
        3 * 24 * 60 * 60 * 1000,
        2 * 24 * 60 * 60 * 1000,
        1 * 24 * 60 * 60 * 1000,
        12 * 60 * 60 * 1000,
        6 * 60 * 60 * 1000,
        1 * 60 * 60 * 1000,
        30 * 60 * 1000
    ];

    for (const offset of notifyOffsets) {
        const notifyTime = new Date(startDateTime.getTime() - offset);
        const diff = now.getTime() - notifyTime.getTime();
        if (diff >= 0 && diff <= 5 * 60 * 1000) {
            const offsetStr = formatOffset(offset);
            const title = `${activity.title || 'ไม่ระบุชื่อกิจกรรม'} กำลังจะเริ่มใน ${offsetStr}`;
            const message = `${formatDateTime(startDateTime)}\nในอีก ${offsetStr}\nโปรดตรวจสอบรายละเอียดกิจกรรม\n${formatDateTime(startDateTime)} ถึง ${formatDateTime(endDateTime)}`;
            reminders.push({
                activity_id: activity.activity_id,
                type: 'upcoming',
                title,
                message,
                timestamp: new Date().toISOString(),
                read: false,
                link: (activity.requester_id === userId) ? `myactivity-details.html?id=${activity.activity_id}` : `activity-details.html?id=${activity.activity_id}`,
                status: activity.status,
                start_date: activity.start_date,
                start_time: activity.start_time,
                end_date: activity.end_date,
                end_time: activity.end_time,
                colorClass: statusColor[activity.status] || 'bg-gray-500',
                extraKey: `upcoming-${offset}`
            });
        }
    }
    return reminders;
}

function generateOngoingNotification(activity, prevStatus) {
    const safeTitle = activity.title || 'ไม่ระบุชื่อกิจกรรม';
    const title = safeTitle;
    const message = `
    <div class="text-xs text-gray-700 mt-2 leading-relaxed">
        <div><i class="fas fa-calendar-alt mr-1 text-gray-500"></i>${formatActivityDuration(activity.start_date, activity.start_time, activity.end_date, activity.end_time)}</div>
        <div class="mt-2 flex items-center gap-2">
            <span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[prevStatus] || 'bg-gray-400'}">${prevStatus}</span>
            <span class="text-xs">→</span>
            <span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[activity.status] || 'bg-gray-400'}">${activity.status}</span>
        </div>
        <div class="mt-2 text-gray-500">สถานะเปลี่ยนแปลงระหว่างช่วงเวลากิจกรรม</div>
    </div>
`;
    return {
        activity_id: activity.activity_id,
        type: 'status_change',
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        link: (activity.requester_id === userId) ? `myactivity-details.html?id=${activity.activity_id}` : `activity-details.html?id=${activity.activity_id}`,
        status: activity.status,
        old_status: prevStatus,
        start_date: activity.start_date,
        start_time: activity.start_time,
        end_date: activity.end_date,
        end_time: activity.end_time,
        location: activity.location,
        colorClass: statusColor[activity.status] || 'bg-gray-500'
    };
}

function generateWaitConfirmRequesterNotification(activity, prevStatus) {
    const now = new Date();
    const endDateTime = new Date(`${activity.end_date}T${activity.end_time || '23:59:59'}`);
    const confirmDeadline = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);

    const title = `ถึง คุณ ${activity.requester_name || 'ผู้ขอ'}`;
    const message = `ณ ตอนนี้กิจกรรม "${activity.title}" สามารถกดยืนยันผลของกิจกรรมได้ที่ participant-detail.html\n${formatDateTime(endDateTime)} ถึง ${formatDateTime(endDateTime)}\n${prevStatus} -> ${activity.status}`;

    const notifications = [{
        activity_id: activity.activity_id,
        type: 'wait_confirm_requester',
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        link: `participant-detail.html?id=${activity.activity_id}`,
        status: activity.status,
        old_status: prevStatus,
        start_date: activity.start_date,
        start_time: activity.start_time,
        end_date: activity.end_date,
        end_time: activity.end_time,
        location: activity.location,
        colorClass: statusColor[activity.status] || 'bg-gray-500',
        extraKey: 'wait_confirm_requester_initial'
    }];

    const diffToDeadline = confirmDeadline.getTime() - now.getTime();
    if (diffToDeadline > 0 && diffToDeadline <= 60 * 60 * 1000) {
        const title2 = `เตือน: ยืนยันผลกิจกรรม "${activity.title}" ภายใน 1 ชั่วโมง`;
        const message2 = `คุณมีเวลาเหลือ 1 ชั่วโมงในการยืนยันผลกิจกรรม\nโปรดกดยืนยันผลที่ participant-detail.html\n${formatDateTime(endDateTime)} ถึง ${formatDateTime(endDateTime)}`;
        notifications.push({
            activity_id: activity.activity_id,
            type: 'wait_confirm_requester',
            title: title2,
            message: message2,
            timestamp: new Date().toISOString(),
            read: false,
            link: `participant-detail.html?id=${activity.activity_id}`,
            status: activity.status,
            old_status: prevStatus,
            start_date: activity.start_date,
            start_time: activity.start_time,
            end_date: activity.end_date,
            end_time: activity.end_time,
            location: activity.location,
            colorClass: statusColor[activity.status] || 'bg-gray-500',
            extraKey: 'wait_confirm_requester_1hour'
        });
    }

    return notifications;
}

function generateWaitConfirmParticipantNotification(activity, prevStatus) {
    const safeTitle = activity.title || 'ไม่ระบุชื่อกิจกรรม';
    const title = `${safeTitle} รอการยืนยันผลจากผู้ขอ`;

    const message = `
        <div class="text-xs text-gray-700 mt-2 leading-relaxed">
            <div><i class="fas fa-map-marker-alt mr-1 text-gray-500"></i>สถานที่: ${activity.location}</div>
            <div class="mt-1"><i class="fas fa-calendar-alt mr-1 text-gray-500"></i>${formatActivityDuration(activity.start_date, activity.start_time, activity.end_date, activity.end_time)}</div>
            <div class="mt-2 flex items-center gap-2">
                <span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[prevStatus] || 'bg-gray-400'}">${prevStatus}</span>
                <span class="text-xs">→</span>
                <span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[activity.status] || 'bg-gray-400'}">${activity.status}</span>
            </div>
            <div class="mt-2 text-gray-500">ถ้าผู้ขอยังไม่ยืนยันผลภายในวันพรุ่งนี้ รบกวนติดต่อผู้ขอ</div>
        </div>
    `;

    return {
        activity_id: activity.activity_id,
        type: 'wait_confirm_participant',
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        link: (activity.requester_id === userId)
            ? `myactivity-details.html?id=${activity.activity_id}`
            : `activity-details.html?id=${activity.activity_id}`,
        status: activity.status,
        old_status: prevStatus,
        start_date: activity.start_date,
        start_time: activity.start_time,
        end_date: activity.end_date,
        end_time: activity.end_time,
        location: activity.location,
        colorClass: statusColor[activity.status] || 'bg-gray-500'
    };
}

function generateWaitApprovalNotification(activity, prevStatus) {
    const safeTitle = activity.title || 'ไม่ระบุชื่อกิจกรรม';
    const title = `${safeTitle} อยู่ระหว่างรออนุมัติจากผู้ดูแล TimeBank`;
    
    const timeInfo = formatActivityDuration(
        activity.start_date,
        activity.start_time,
        activity.end_date,
        activity.end_time
    );

    const message = `
        <div class="text-sm text-gray-700 mt-2 leading-relaxed">
            <div><i class="fas fa-map-marker-alt mr-1 text-gray-500"></i>${activity.location}</div>
            <div class="mt-1"><i class="fas fa-calendar-alt mr-1 text-gray-500"></i>${timeInfo}</div>
            <div class="mt-2 flex items-center gap-2">
                <span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[prevStatus] || 'bg-gray-400'}">${prevStatus}</span>
                <span class="text-xs">→</span>
                <span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[activity.status] || 'bg-gray-400'}">${activity.status}</span>
            </div>
            <div class="mt-2 text-gray-500">ตรวจสอบในรายละเอียดกิจกรรม</div>
        </div>
    `;

    return {
        activity_id: activity.activity_id,
        type: 'wait_approval',
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        link: (activity.requester_id === userId)
            ? `myactivity-details.html?id=${activity.activity_id}`
            : `activity-details.html?id=${activity.activity_id}`,
        status: activity.status,
        old_status: prevStatus,
        start_date: activity.start_date,
        start_time: activity.start_time,
        end_date: activity.end_date,
        end_time: activity.end_time,
        location: activity.location,
        colorClass: statusColor[activity.status] || 'bg-gray-500'
    };
}

function generateCompletedNotification(activity, prevStatus) {
    let tokenInfo = '';
    if (activity.tokens && userId && activity.tokens[userId]) {
        tokenInfo = `คุณได้รับโทเค็นเวลาจำนวน ${activity.tokens[userId]} โทเค็น`;
    } else {
        tokenInfo = 'โปรดตรวจสอบรายละเอียดกิจกรรม';
    }
    const safeTitle = activity.title || 'ไม่ระบุชื่อกิจกรรม';
    const title = safeTitle;
    
    const message = `โทเค็นเวลาจะถูกโอนไปยังบัญชีเวลาของผู้เข้าร่วม\n${tokenInfo}\nโปรดตรวจสอบรายละเอียดกิจกรรม`;
    return {
        activity_id: activity.activity_id,
        type: 'completed',
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        link: (activity.requester_id === userId) ? `myactivity-details.html?id=${activity.activity_id}` : `activity-details.html?id=${activity.activity_id}`,
        status: activity.status,
        old_status: prevStatus,
        start_date: activity.start_date,
        start_time: activity.start_time,
        end_date: activity.end_date,
        end_time: activity.end_time,
        location: activity.location,
        colorClass: statusColor[activity.status] || 'bg-gray-500'
    };
}

function generateInsufficientParticipantsNotification(activity, prevStatus) {
    const title = `"${activity.title}" ถูกยกเลิก`;
    const reason = activity.cancel_reason || 'ผู้เข้าร่วมไม่ครบ จึงจำเป็นต้องยกเลิก';
    const message = `${reason}\nโปรดตรวจสอบรายละเอียดกิจกรรม`;
    return {
        activity_id: activity.activity_id,
        type: 'cancelled',
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        link: (activity.requester_id === userId) ? `myactivity-details.html?id=${activity.activity_id}` : `activity-details.html?id=${activity.activity_id}`,
        status: activity.status,
        old_status: prevStatus,
        start_date: activity.start_date,
        start_time: activity.start_time,
        end_date: activity.end_date,
        end_time: activity.end_time,
        location: activity.location,
        colorClass: statusColor[activity.status] || 'bg-gray-500'
    };
}

function generateOverdueNotification(activity, prevStatus) {
    const title = `"${activity.title}" เลยเวลาที่กำหนด`;
    const message = `โปรดตรวจสอบรายละเอียดกิจกรรม\n${formatDateTime(`${activity.start_date}T${activity.start_time || '00:00:00'}`)} ถึง ${formatDateTime(`${activity.end_date}T${activity.end_time || '23:59:59'}`)}`;

    return {
        activity_id: activity.activity_id,
        type: 'overdue',
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        link: activity.requester_id === userId
            ? `myactivity-details.html?id=${activity.activity_id}`
            : `activity-details.html?id=${activity.activity_id}`,
        status: activity.status,
        old_status: prevStatus,
        start_date: activity.start_date,
        start_time: activity.start_time,
        end_date: activity.end_date,
        end_time: activity.end_time,
        location: activity.location,
        colorClass: statusColor[activity.status] || 'bg-orange-500'
    };
}

function generateCancelledNotification(activity, prevStatus) {
    const title = `"${activity.title}" ถูกยกเลิก`;
    const message = `โปรดตรวจสอบรายละเอียดกิจกรรม\n${formatDateTime(`${activity.start_date}T${activity.start_time || '00:00:00'}`)} ถึง ${formatDateTime(`${activity.end_date}T${activity.end_time || '23:59:59'}`)}`;

    return {
        activity_id: activity.activity_id,
        type: 'cancelled',
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        link: activity.requester_id === userId
            ? `myactivity-details.html?id=${activity.activity_id}`
            : `activity-details.html?id=${activity.activity_id}`,
        status: activity.status,
        old_status: prevStatus,
        start_date: activity.start_date,
        start_time: activity.start_time,
        end_date: activity.end_date,
        end_time: activity.end_time,
        location: activity.location,
        colorClass: statusColor[activity.status] || 'bg-red-600'
    };
}

function resolveStatusMapping(oldStatus, newStatus) {
    if (oldStatus === 'กำลังจะเริ่ม' && newStatus === 'กำลังทำกิจกรรม') {
        return 'กำลังทำกิจกรรม';
    }
    if (oldStatus === 'กำลังจะเริ่ม' && newStatus === 'ผู้เข้าร่วมไม่ครบ') {
        return 'ผู้เข้าร่วมไม่ครบ';
    }
    if (oldStatus === 'รอผู้ขอยืนยันผล' && newStatus === 'เกินเวลา') {
        return 'เกินเวลา';
    }
    if (oldStatus === 'รอผู้ขอยืนยันผล' && newStatus === 'รอการอนุมัติ') {
        return 'รอการอนุมัติ';
    }
    if (oldStatus === 'กำลังจะเริ่ม' && newStatus === 'ยกเลิก') {
        return 'ยกเลิก';
    }
    if (oldStatus === 'รอการอนุมัติ' && newStatus === 'เสร็จสิ้น') {
        return 'เสร็จสิ้น';
    }
    return newStatus;
}

async function fetchUserActivitiesAndDetectChanges() {
    if (!userId || !token) return;

    try {
        const headers = { 'Authorization': `Bearer ${token}` };

        const ongoingRes = await fetch(`http://localhost:3000/api/user/activities/ongoing/${userId}`, { headers });
        if (!ongoingRes.ok) throw new Error('Failed to fetch ongoing activities');
        const ongoingData = await ongoingRes.json();

        const historyRes = await fetch(`http://localhost:3000/api/user/activities/history/${userId}`, { headers });
        if (!historyRes.ok) throw new Error('Failed to fetch history activities');
        const historyData = await historyRes.json();

        const allActivities = [...ongoingData.activities, ...historyData.activities];

        for (const activity of allActivities) {
            try {
                const partRes = await fetch(`http://localhost:3000/api/user/activities/${activity.activity_id}/participants`, { headers });
                if (partRes.ok) {
                    const participants = await partRes.json();
                    activity.participants = participants;
                } else {
                    activity.participants = [];
                }
            } catch {
                activity.participants = [];
            }
        }

        const involvedActivities = allActivities.filter(activity => {
            if (activity.requester_id === userId) return true;
            if (activity.participants.some(p => p.user_id === userId)) return true;
            return false;
        });

        for (const activity of involvedActivities) {
            const prev = lastActivityStates.get(activity.activity_id);

            if (!prev) {
                lastActivityStates.set(activity.activity_id, {
                    status: activity.status,
                    updated_at: activity.updated_at || activity.created_at || new Date().toISOString(),
                    confirmed: activity.confirmed || false
                });
                continue;
            }

            const resolvedStatus = resolveStatusMapping(prev.status, activity.status);

            if (prev.status !== activity.status) {
                removeOldNotifications(activity.activity_id, 'status_change');
                addNotification(activity, prev.status);
            
                lastActivityStates.set(activity.activity_id, {
                    status: activity.status,
                    updated_at: activity.updated_at || activity.created_at || new Date().toISOString(),
                    confirmed: activity.confirmed || false
                });
            } else {
                if (!isSameDateTime(prev.updated_at, activity.updated_at)) {
                    removeOldNotifications(activity.activity_id, 'updated');

                    addNotification({
                        activity_id: activity.activity_id,
                        type: 'updated',
                        title: `"${(activity.title)}" มีการอัปเดต`,
                        message: `โปรดตรวจสอบรายละเอียดกิจกรรม\nวันที่เริ่ม: ${formatDateTime(`${activity.start_date}T${activity.start_time || '00:00:00'}`)}\nวันที่สิ้นสุด: ${formatDateTime(`${activity.end_date}T${activity.end_time || '23:59:59'}`)}`,
                        timestamp: new Date().toISOString(),
                        read: false,
                        link: (activity.requester_id === userId) ? `myactivity-details.html?id=${activity.activity_id}` : `activity-details.html?id=${activity.activity_id}`,
                        status: activity.status,
                        old_status: prev.status || activity.status,
                        start_date: activity.start_date,
                        start_time: activity.start_time,
                        end_date: activity.end_date,
                        end_time: activity.end_time,
                        location: activity.location,
                        colorClass: statusColor[activity.status] || 'bg-gray-500'
                    });

                    lastActivityStates.set(activity.activity_id, {
                        status: activity.status,
                        updated_at: activity.updated_at || activity.created_at || new Date().toISOString(),
                        confirmed: activity.confirmed || false
                    });
                }
            }

            const upcomingReminders = generateUpcomingReminders(activity);
            for (const reminder of upcomingReminders) {
                if (!notifications.some(n => n._key === reminder._key)) {
                    addNotification(reminder);
                }
            }
        }

        const relevantStatuses = new Set([
            'กำลังทำกิจกรรม',
            'รอผู้ขอยืนยันผล',
            'รอการอนุมัติ',
            'กำลังจะเริ่ม',
            'เสร็จสิ้น',
            'ยกเลิก',
            'เกินเวลา',
            'ผู้เข้าร่วมไม่ครบ'
        ]);

        for (const activity of involvedActivities) {
            const resolvedStatus = resolveStatusMapping(activity.status, activity.status);
            if (relevantStatuses.has(resolvedStatus)) {
                const exists = notifications.some(n => n.activity_id === activity.activity_id && n.status === resolvedStatus);
                if (!exists) {
                    let notif;
                    switch (resolvedStatus) {
                        case 'กำลังทำกิจกรรม':
                            notif = generateOngoingNotification(activity, resolvedStatus);
                            break;
                        case 'รอผู้ขอยืนยันผล':
                            if (activity.requester_id === userId) {
                                const notifs = generateWaitConfirmRequesterNotification(activity, resolvedStatus);
                                notifs.forEach(n => addNotification(n));
                                continue;
                            } else {
                                notif = generateWaitConfirmParticipantNotification(activity, resolvedStatus);
                            }
                            break;
                        case 'รอการอนุมัติ':
                            notif = generateWaitApprovalNotification(activity, 'รอผู้ขอยืนยันผล');
                            break;
                        case 'กำลังจะเริ่ม':
                            notif = {
                                activity_id: activity.activity_id,
                                type: 'status_change',
                                title: `กิจกรรม "${activity.title}" กำลังจะเริ่ม`,
                                message: `โปรดตรวจสอบรายละเอียดกิจกรรม\nวันที่เริ่ม: ${formatDateTime(`${activity.start_date}T${activity.start_time || '00:00:00'}`)}\nวันที่สิ้นสุด: ${formatDateTime(`${activity.end_date}T${activity.end_time || '23:59:59'}`)}`,
                                timestamp: new Date().toISOString(),
                                read: false,
                                link: (activity.requester_id === userId) ? `myactivity-details.html?id=${activity.activity_id}` : `activity-details.html?id=${activity.activity_id}`,
                                status: resolvedStatus,
                                old_status: resolvedStatus,
                                start_date: activity.start_date,
                                start_time: activity.start_time,
                                end_date: activity.end_date,
                                end_time: activity.end_time,
                                location: activity.location,
                                colorClass: statusColor[resolvedStatus] || 'bg-gray-500'
                            };
                            break;
                        case 'เสร็จสิ้น':
                            notif = generateCompletedNotification(activity, 'รอการอนุมัติ');
                            break;
                    }
                    if (notif) addNotification(notif);
                }
            }
        }

        const involvedIds = new Set(involvedActivities.map(a => a.activity_id));
        notifications = notifications.filter(n => {
            if (!n.activity_id) return true;
            if (involvedIds.has(n.activity_id)) return true;
            return !n.read;
        });

        localStorage.setItem('notifications', JSON.stringify(notifications));

        renderNotificationPanel();

    } catch (err) {
        console.error('Error fetching activities for notifications:', err);
    }
}

function renderNotificationPanel() {
    const list = document.getElementById('notification-list');
    const count = document.getElementById('notification-count');
    const noNotif = document.getElementById('no-notifications');

    if (!list || !count || !noNotif) return;

    list.innerHTML = '';

    if (notifications.length === 0) {
        noNotif.classList.remove('hidden');
        count.classList.add('hidden');
        return;
    } else {
        noNotif.classList.add('hidden');
    }

    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let unreadCount = 0;
    const now = new Date();
    const todayGroup = [];
    const yesterdayGroup = [];
    const earlierGroup = [];

    notifications.forEach(n => {
        const notifDate = new Date(n.timestamp);
        const notifDay = notifDate.getDate();
        const notifMonth = notifDate.getMonth();
        const notifYear = notifDate.getFullYear();

        const today = now.getDate();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        if (notifYear === thisYear && notifMonth === thisMonth && notifDay === today) {
            todayGroup.push(n);
        } else if (
            notifYear === thisYear &&
            notifMonth === thisMonth &&
            notifDay === today - 1
        ) {
            yesterdayGroup.push(n);
        } else {
            earlierGroup.push(n);
        }
    });

    function renderGroup(title, group) {
        if (group.length === 0) return;

        const groupTitle = document.createElement('li');
        groupTitle.className = 'px-3 py-2 text-xs font-bold text-gray-500 uppercase bg-gray-100 rounded mt-2 mb-1';
        groupTitle.textContent = title;
        list.appendChild(groupTitle);

        group.forEach(n => {
            const item = document.createElement('li');
            item.className = `p-3 hover:bg-gray-100 text-sm text-gray-800 cursor-pointer flex flex-col rounded-md mb-1 ${n.read ? 'opacity-70' : ''}`;
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'button');
            item.setAttribute('aria-pressed', n.read ? 'true' : 'false');

            const titleHtml = `<div class="flex items-center space-x-2">
            <i class="fas fa-clipboard-list text-blue-600"></i>
            <div class="font-medium">${n.title}</div>
        </div>`;        
        
            let messageHtml = '';
            if (typeof n.message === 'string' && n.message.includes('<div')) {
                messageHtml = n.message;
            } else {
                const oldStatusSpan = n.old_status ? `<span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[n.old_status] || 'bg-gray-400'}">${n.old_status}</span>` : '';
                const newStatusSpan = n.status ? `<span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[n.status] || 'bg-gray-400'}">${n.status}</span>` : '';
                const arrow = (n.old_status && n.status) ? `<span class="text-xs">→</span>` : '';
                const locationText = n.location || '';

                messageHtml = `
                    <div class="text-xs text-gray-700 mt-2 leading-relaxed">
                        <div class="mt-2 flex items-center gap-2">
                            ${oldStatusSpan}
                            ${arrow}
                            ${newStatusSpan}
                        </div>
                        <div class="mt-2"><i class="fas fa-map-marker-alt mr-1 text-gray-500"></i>สถานที่: ${locationText}</div>
                        <div class="mt-1"><i class="fas fa-calendar-alt mr-1 text-gray-500"></i>${formatActivityDuration(n.start_date, n.start_time, n.end_date, n.end_time)}</div>
                    </div>
                `;
            }

            const timeHtml = `<div class="text-xs text-gray-400 mt-1">${formatRelativeTime(n.timestamp)}</div>`;

            item.innerHTML = titleHtml + messageHtml + timeHtml;

            item.addEventListener('click', () => {
                if (!n.read) {
                    n.read = true;
                    renderNotificationPanel();
                }
                if (n.link) window.location.href = n.link;
            });

            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });

            list.appendChild(item);
            if (!n.read) unreadCount++;
        });
    }

    renderGroup('วันนี้', todayGroup);
    renderGroup('เมื่อวาน', yesterdayGroup);
    renderGroup('ก่อนหน้านี้', earlierGroup);

    count.textContent = unreadCount;
    count.classList.toggle('hidden', unreadCount === 0);
}

function setupNotificationEvents() {
    const bell = document.getElementById('notification-bell');
    const panel = document.getElementById('notification-panel');
    const clearBtn = document.getElementById('clear-notifications');

    if (!bell || !panel || !clearBtn) return;

    bell.addEventListener('click', () => {
        panel.classList.toggle('hidden');
        const expanded = bell.getAttribute('aria-expanded') === 'true';
        bell.setAttribute('aria-expanded', !expanded);
    });

    clearBtn.addEventListener('click', () => {
        notifications = [];
        renderNotificationPanel();
    });

    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !bell.contains(e.target)) {
            panel.classList.add('hidden');
            bell.setAttribute('aria-expanded', 'false');
        }
    });
}

function setupNotifications() {
    injectNotificationUI();

    token = localStorage.getItem('token');
    userId = parseInt(localStorage.getItem('user_id'));

    if (!token || !userId) {
        console.warn('User not logged in or missing token/userId');
        return;
    }

    fetchUserActivitiesAndDetectChanges();

    setInterval(fetchUserActivitiesAndDetectChanges, 60000);

    setupNotificationEvents();
}

document.addEventListener('DOMContentLoaded', setupNotifications);