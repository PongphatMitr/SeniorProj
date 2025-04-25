let token = null;
let userId = null;
let statusChangeNotifications = [];
let notifications = [];
let inactiveUnifiedNotifications = [];
let clearedInactiveUnifiedIds = JSON.parse(localStorage.getItem('clearedInactiveUnifiedIds') || '[]');
let clearedUnifiedIds = JSON.parse(localStorage.getItem('clearedUnifiedIds') || '[]');


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

function injectNotificationUI() {
  const bellContainer = document.createElement('div');
  bellContainer.className = 'absolute right-0 top-0 mr-4 mt-4 z-50';
  bellContainer.innerHTML = `
    <button id="notification-bell" class="relative focus:outline-none" aria-label="Toggle notifications panel" aria-expanded="false" aria-controls="notification-panel">
      <i class="fas fa-bell text-white text-2xl"></i>
      <span id="notification-count" class="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1 hidden">0</span>
    </button>
    <div id="notification-panel"
    class="hidden absolute right-0 mt-3 w-[30rem] max-h-[32rem] bg-white rounded-xl shadow-2xl overflow-y-auto ring-1 ring-black ring-opacity-5 border border-gray-200"
    role="region" aria-live="polite" aria-label="แผงการแจ้งเตือน">
    <div class="sticky top-0 z-20 px-5 py-3 bg-white border-b border-gray-200 rounded-t-xl flex justify-between items-center shadow-sm">
        <div class="flex items-center gap-2 text-blue-700">
            <i class="fas fa-bell text-lg"></i>
            <h2 class="text-base font-semibold">การแจ้งเตือนกิจกรรม</h2>
        </div>
        <div class="flex gap-4 items-center">
            <button id="mark-read"
                class="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:underline transition"
                type="button">
                <i class="fas fa-eye text-[13px]"></i> อ่านทั้งหมด
            </button>
            <button id="clear-notifications"
                class="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 hover:underline transition"
                type="button">
                <i class="fas fa-trash-alt text-[13px]"></i> ล้างทั้งหมด
            </button>
        </div>
          </div>
      <ul id="notification-list" class="divide-y divide-gray-200"></ul>
      <div id="no-notifications" class="p-4 text-center text-gray-500 italic hidden">ไม่มีการแจ้งเตือนใหม่</div>
    </div>`;
  const headerBar = document.querySelector('.relative.mb-10') || document.body;
  headerBar.appendChild(bellContainer);
}

function formatOffset(offsetMs) {
  if (offsetMs >= 86400000) return `${Math.floor(offsetMs / 86400000)} วัน`;
  if (offsetMs >= 3600000) return `${Math.floor(offsetMs / 3600000)} ชั่วโมง`;
  if (offsetMs >= 60000) return `${Math.floor(offsetMs / 60000)} นาที`;
  return '';
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

function formatActivityDuration(startDateRaw, startTime, endDateRaw, endTime) {
  try {
    let startDate = new Date(startDateRaw);
    let endDate = new Date(endDateRaw);

    if (startTime && startTime.includes(':')) {
      const [h, m] = startTime.split(':');
      startDate.setHours(parseInt(h), parseInt(m));
    }
    if (endTime && endTime.includes(':')) {
      const [h, m] = endTime.split(':');
      endDate.setHours(parseInt(h), parseInt(m));
    }

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = startDate.getDate();
    const month = thaiMonths[startDate.getMonth()];
    const year = startDate.getFullYear() + 543;

    const startHour = startDate.getHours().toString().padStart(2, '0');
    const startMinute = startDate.getMinutes().toString().padStart(2, '0');
    const endHour = endDate.getHours().toString().padStart(2, '0');
    const endMinute = endDate.getMinutes().toString().padStart(2, '0');

    return `${day} ${month} ${year} เวลา ${startHour}.${startMinute} น.-${endHour}.${endMinute} น.`;
  } catch (err) {
    console.error('❌ Invalid date format:', err);
    return 'เวลาผิดพลาด';
  }
}

function generateNotificationHTML(activity, status, prevStatus = null, description = '', timeStr = '') {
  const location = activity.location || 'ไม่ระบุ';
  const timeDisplay = timeStr || formatActivityDuration(activity.start_date, activity.start_time, activity.end_date, activity.end_time);
  const statusChange = prevStatus && prevStatus !== status;

  return `
  <div class="text-sm text-gray-700">
    <div class="font-semibold"><i class='fas fa-clipboard-list text-blue-700 mr-1'></i> ${activity.title}${statusChange ? ` มีการเปลี่ยนสถานะ` : ''}</div>
    <div class="text-xs text-gray-700 mt-2 leading-relaxed">
      <div><i class="fas fa-map-marker-alt mr-1 text-red-500"></i>สถานที่: ${location}</div>
      <div class="mt-1"><i class="fas fa-calendar-alt mr-1 text-gray-500"></i>${timeDisplay}</div>
      <div class="mt-2">
        ${statusChange ? `
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[prevStatus] || 'bg-gray-400'}">${prevStatus}</span>
            <span class="text-xs">→</span>
            <span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[status] || 'bg-gray-600'}">${status}</span>
          </div>
        ` : `
          <span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[status] || 'bg-gray-600'}">${status}</span>
        `}
      </div>
      <div class="mt-2 text-gray-500">${description || 'โปรดตรวจสอบรายละเอียดกิจกรรม'}</div>
    </div>
  </div>
  `;
}

function createUnifiedNotification(activity, prevStatus = null) {
  const timeStr = formatActivityDuration(activity.start_date, activity.start_time, activity.end_date, activity.end_time);

  const statusDescriptions = {
    'กำลังจะเริ่ม': 'โปรดเตรียมตัวเข้าร่วมกิจกรรม',
    'กำลังทำกิจกรรม': 'กิจกรรมกำลังดำเนินอยู่',
    'รอผู้ขอยืนยันผล': 'โปรดยืนยันการเข้าร่วมกิจกรรมหลังจบกิจกรรม',
    'รอการอนุมัติ': 'กำลังรออนุมัติ โปรดติดตามผลการอนุมัติ',
    'เกินเวลา': 'กิจกรรมเลยเวลา โปรดตรวจสอบสถานะของคุณ',
  };

  const description = statusDescriptions[activity.status] || 'โปรดตรวจสอบรายละเอียดกิจกรรม';

  const message = generateNotificationHTML(
    activity,
    activity.status,
    prevStatus,
    description,
    timeStr
  );

  return {
    id: `unified-${activity.activity_id}-${Date.now()}`,
    activity_id: activity.activity_id,
    title: `กิจกรรม "${activity.title}"`,
    message,
    timestamp: new Date().toISOString(),
    read: false,
    link: activity.requester_id === userId ? `myactivity-details.html?id=${activity.activity_id}` : `activity-details.html?id=${activity.activity_id}`,
    status: activity.status,
    prevStatus: prevStatus || null,
    type: 'unified'
  };
}

function createInactiveUnifiedNotification(activity, prevStatus = null) {
    const inactiveStatuses = ['เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา', 'ผู้เข้าร่วมไม่ครบ'];
    if (!inactiveStatuses.includes(activity.status)) return null;
  
    const timeStr = formatActivityDuration(activity.start_date, activity.start_time, activity.end_date, activity.end_time);
  
    const description = 'กิจกรรมของคุณสิ้นสุดลงแล้ว โปรดตรวจสอบรายละเอียด';
  
    const message = generateNotificationHTML(
      activity,
      activity.status,
      prevStatus,
      description,
      timeStr
    );
  
    return {
      id: `inactive-unified-${activity.activity_id}-${Date.now()}`,
      activity_id: activity.activity_id,
      title: `สิ้นสุดกิจกรรม "${activity.title}"`,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      link: activity.requester_id === userId ? `myactivity-details.html?id=${activity.activity_id}` : `activity-details.html?id=${activity.activity_id}`,
      status: activity.status,
      prevStatus: prevStatus,
      type: 'inactive-unified'
    };
  }
  

function createStatusChangeNotification(activity, oldStatus, newStatus) {
  const resolvedNewStatus = resolveStatusMapping(oldStatus, newStatus);

  const timeStr = formatActivityDuration(activity.start_date, activity.start_time, activity.end_date, activity.end_time);

  const message = generateNotificationHTML(
    activity,
    resolvedNewStatus,
    oldStatus,
    'สถานะกิจกรรมมีการเปลี่ยนแปลง โปรดตรวจสอบ',
    timeStr
  );

  return {
    id: `statuschange-${activity.activity_id}-${Date.now()}`,
    activity_id: activity.activity_id,
    title: `สถานะเปลี่ยนแปลงกิจกรรม "${activity.title}"`,
    message,
    timestamp: new Date().toISOString(),
    read: false,
    link: activity.requester_id === userId ? `myactivity-details.html?id=${activity.activity_id}` : `activity-details.html?id=${activity.activity_id}`,
    status: resolvedNewStatus,
    prevStatus: oldStatus,
    type: 'statuschange'
  };
}

function renderNotificationPanel() {
  const list = document.getElementById('notification-list');
  const count = document.getElementById('notification-count');
  const noNotif = document.getElementById('no-notifications');

  notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  statusChangeNotifications = JSON.parse(localStorage.getItem('statusChangeNotifications') || '[]');
  inactiveUnifiedNotifications = JSON.parse(localStorage.getItem('inactiveUnifiedNotifications') || '[]');

  const activeStatuses = ['กำลังจะเริ่ม', 'กำลังทำกิจกรรม', 'รอผู้ขอยืนยันผล', 'รอการอนุมัติ'];

  const getStartTimeMs = (n) => {
    const dateStr = n.start_date || (n.activity && n.activity.start_date);
    const timeStr = n.start_time || (n.activity && n.activity.start_time);
    if (!dateStr || !timeStr) return 0;
    return new Date(`${dateStr}T${timeStr}`).getTime();
  };

  // Separate notifications by type and read status
  const unifiedUnreadActive = [];
  const unifiedUnreadInactive = [];
  const unifiedReadInactive = [];

  for (const n of notifications) {
    // Skip inactive-unified notifications so they won't be rendered
    if (n.type === 'inactive-unified') continue;

    const isActive = activeStatuses.includes(n.status);
    if (!n.read && isActive) unifiedUnreadActive.push(n);
    else if (!n.read && !isActive) unifiedUnreadInactive.push(n);
    else if (n.read && !isActive) unifiedReadInactive.push(n);
  }

  const statusChangeUnread = statusChangeNotifications.filter(n => !n.read);
  const statusChangeRead = statusChangeNotifications.filter(n => n.read);

  const sortByStartTime = arr => arr.sort((a, b) => getStartTimeMs(a) - getStartTimeMs(b));
  sortByStartTime(unifiedUnreadActive);
  sortByStartTime(unifiedUnreadInactive);
  sortByStartTime(unifiedReadInactive);
  sortByStartTime(statusChangeUnread);
  sortByStartTime(statusChangeRead);

  list.innerHTML = '';
  let unread = 0;

  const renderGroup = (title, items, groupId) => {
    if (items.length === 0) return;
    const li = document.createElement('li');
    li.className = `
      sticky top-[3.25rem] z-10
      px-6 py-3
      bg-white/80 backdrop-blur-md
      border-b border-gray-200
      flex items-center gap-3
      text-base font-semibold text-gray-800
      shadow-sm
      transition-all duration-300
    `;
    li.dataset.groupId = groupId;

    const iconMap = {
      active: `<i class="fas fa-briefcase text-blue-600 text-lg"></i>`,
      statuschange: `<i class="fas fa-exchange-alt text-purple-600 text-lg"></i>`,
      others: `<i class="fas fa-archive text-gray-500 text-lg"></i>`,
    };

    const labelMap = {
      active: 'กิจกรรมของฉันที่กำลังดำเนินอยู่',
      statuschange: 'การเปลี่ยนแปลงของกิจกรรม',
      others: 'กิจกรรมอื่น ๆ ทั้งหมด',
    };

    li.innerHTML = `
      ${iconMap[groupId] || ''}
      <span>${labelMap[groupId] || title}</span>
    `;

    list.appendChild(li);

    for (const n of items) {
      const isRead = n.read;
      const isInactive = !activeStatuses.includes(n.status);
      const isStatusChange = n.type === 'statuschange';

      const itemLi = document.createElement('li');
      itemLi.className = `p-3 cursor-pointer rounded-md transition hover:bg-gray-100 ${isRead ? 'opacity-60' : ''}`;
      itemLi.innerHTML = `${n.message}<div class='text-xs text-gray-400 mt-1'>${formatRelativeTime(n.timestamp)}</div>`;

      itemLi.onclick = () => {
        if (isStatusChange) {
          const idx = statusChangeNotifications.findIndex(x => x.id === n.id);
          if (idx !== -1) {
            statusChangeNotifications[idx].read = true;
            localStorage.setItem('statusChangeNotifications', JSON.stringify(statusChangeNotifications));
          }
        } else {
          const idx = notifications.findIndex(x => x.id === n.id);
          if (idx !== -1) {
            notifications[idx].read = true;
            localStorage.setItem('notifications', JSON.stringify(notifications));
          }
        }
        renderNotificationPanel();
        if (n.link) location.href = n.link;
      };

      list.appendChild(itemLi);
      if (!isRead) unread++;
    }
  };

  renderGroup('กิจกรรมของฉันที่กำลังดำเนินอยู่', unifiedUnreadActive, 'active');
  renderGroup('การเปลี่ยนแปลงของกิจกรรม', [...statusChangeUnread, ...statusChangeRead], 'statuschange');
  renderGroup('กิจกรรมอื่น ๆ ทั้งหมด', [...unifiedUnreadInactive, ...unifiedReadInactive], 'others');

  count.textContent = unread;
  count.classList.toggle('hidden', unread === 0);
  noNotif.classList.toggle('hidden', unread > 0);
}

function setupNotificationEvents() {
  const bell = document.getElementById('notification-bell');
  const panel = document.getElementById('notification-panel');
  const clearBtn = document.getElementById('clear-notifications');
  const markReadBtn = document.getElementById('mark-read');

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !isHidden);
    bell.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  });

  markReadBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const activeStatuses = ['กำลังจะเริ่ม', 'กำลังทำกิจกรรม', 'รอผู้ขอยืนยันผล', 'รอการอนุมัติ'];

    statusChangeNotifications = statusChangeNotifications.map(n => ({ ...n, read: true }));
    inactiveUnifiedNotifications = inactiveUnifiedNotifications.map(n => ({ ...n, read: true }));
    notifications = notifications.map(n => {
      const isActive = activeStatuses.includes(n.status);
      if (!isActive && n.type !== 'inactive-unified') {
        return { ...n, read: true };
      }
      return n;
    });

    localStorage.setItem('notifications', JSON.stringify(notifications));
    localStorage.setItem('statusChangeNotifications', JSON.stringify(statusChangeNotifications));
    localStorage.setItem('inactiveUnifiedNotifications', JSON.stringify(inactiveUnifiedNotifications));
    renderNotificationPanel();
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    // Clear only read statusChangeNotifications
    statusChangeNotifications = statusChangeNotifications.filter(n => !n.read);

    // Clear only read inactive unified notifications and record cleared IDs
    const toClearInactiveIds = inactiveUnifiedNotifications.filter(n => n.read).map(n => n.id);
    clearedInactiveUnifiedIds = [...new Set([...clearedInactiveUnifiedIds, ...toClearInactiveIds])];
    localStorage.setItem('clearedInactiveUnifiedIds', JSON.stringify(clearedInactiveUnifiedIds));
    inactiveUnifiedNotifications = inactiveUnifiedNotifications.filter(n => !n.read);

    // Clear only read unified inactive notifications (excluding inactiveUnifiedNotifications)
    const toClearUnifiedIds = notifications
    .filter(n => n.read && activeStatuses.includes(n.status) && n.type === 'unified')
    .map(n => n.id);
  
    clearedUnifiedIds = [...new Set([...clearedUnifiedIds, ...toClearUnifiedIds])];
    localStorage.setItem('clearedUnifiedIds', JSON.stringify(clearedUnifiedIds));
    
    notifications = notifications.filter(n => {
        if (n.type === 'inactive-unified') return true;
        const isActive = activeStatuses.includes(n.status);
        if (n.read && !isActive) return false; // Clear read inactive
        if (n.read && isActive && n.type === 'unified') return false; // Clear read active
        return true;
    });
  

    localStorage.setItem('notifications', JSON.stringify(notifications));
    localStorage.setItem('statusChangeNotifications', JSON.stringify(statusChangeNotifications));
    localStorage.setItem('inactiveUnifiedNotifications', JSON.stringify(inactiveUnifiedNotifications));
    renderNotificationPanel();
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !bell.contains(e.target)) {
      panel.classList.add('hidden');
      bell.setAttribute('aria-expanded', 'false');
    }
  });
}

function resolveStatusMapping(oldStatus, newStatus) {
  if (oldStatus === 'กำลังจะเริ่ม' && newStatus === 'กำลังทำกิจกรรม') return 'กำลังทำกิจกรรม';
  if (oldStatus === 'กำลังจะเริ่ม' && newStatus === 'ผู้เข้าร่วมไม่ครบ') return 'ผู้เข้าร่วมไม่ครบ';
  if (oldStatus === 'รอผู้ขอยืนยันผล' && newStatus === 'เกินเวลา') return 'เกินเวลา';
  if (oldStatus === 'รอผู้ขอยืนยันผล' && newStatus === 'รอการอนุมัติ') return 'รอการอนุมัติ';
  if (oldStatus === 'กำลังจะเริ่ม' && newStatus === 'ยกเลิก') return 'ยกเลิก';
  if (oldStatus === 'รอการอนุมัติ' && newStatus === 'เสร็จสิ้น') return 'เสร็จสิ้น';
  return newStatus;
}

async function fetchAndCheckNotifications() {
    
  if (!token || !userId) return;

  try {
    const res = await fetch(`http://localhost:3000/api/user/activities`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;

    const data = await res.json();
    let all = data.activities;

    for (let act of all) {
      const resP = await fetch(`http://localhost:3000/api/user/activities/${act.activity_id}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      act.participants = await resP.json();
    }

    const related = all.filter(a =>
      a.requester_id === userId || a.participants.some(p => p.user_id === userId)
    );

    const stored = JSON.parse(localStorage.getItem('notifications') || '[]');
    notifications = stored;

    const activeStatuses = ['กำลังจะเริ่ม', 'กำลังทำกิจกรรม', 'รอผู้ขอยืนยันผล', 'รอการอนุมัติ'];
    let newNotis = [];

    for (let act of related) {
        const currentStatus = act.status;
        const isActive = activeStatuses.includes(currentStatus);
      
        const alreadyStored = notifications.find(n =>
          n.activity_id === act.activity_id &&
          n.status === currentStatus &&
          n.type === 'unified'
        );
      
        const unifiedIdPrefix = `unified-${act.activity_id}`;
      
        const wasCleared = clearedUnifiedIds.some(id => id.startsWith(unifiedIdPrefix));
        if (wasCleared) continue; // ⛔ skip if cleared permanently
      
        if (isActive) {
          const noti = createUnifiedNotification(act);
          newNotis.push(noti);
        } else if (!alreadyStored) {
          const noti = createUnifiedNotification(act);
          newNotis.push(noti);
        } else {
          newNotis.push(alreadyStored);
        }
      }
      

    localStorage.setItem('notifications', JSON.stringify(newNotis));
    notifications = newNotis;
    renderNotificationPanel();
  } catch (e) {
    console.error('⚠️ fetchAndCheckNotifications failed', e);
  }
}

async function fetchAndCheckInactiveUnifiedNotifications() {
  if (!token || !userId) return;

  try {
    const res = await fetch(`http://localhost:3000/api/user/activities`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    let all = data.activities;
    for (let act of all) {
      const resP = await fetch(`http://localhost:3000/api/user/activities/${act.activity_id}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      act.participants = await resP.json();
    }

    const related = all.filter(a => a.requester_id === userId || a.participants.some(p => p.user_id === userId));

    let localInactiveUnifiedNotis = JSON.parse(localStorage.getItem('inactiveUnifiedNotifications') || '[]');

    for (let act of related) {
      const inactiveStatuses = ['เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา', 'ผู้เข้าร่วมไม่ครบ'];
      if (!inactiveStatuses.includes(act.status)) continue;

      const notiIdPrefix = `inactive-unified-${act.activity_id}-`;
      const wasCleared = clearedInactiveUnifiedIds.some(id => id.startsWith(notiIdPrefix));
      if (wasCleared) continue;

      const alreadyExists = localInactiveUnifiedNotis.some(n =>
        n.activity_id === act.activity_id &&
        n.status === act.status &&
        n.type === 'inactive-unified'
      );

      if (!alreadyExists) {
        const noti = createInactiveUnifiedNotification(act);
        if (noti) localInactiveUnifiedNotis.push(noti);
      }
    }

    localInactiveUnifiedNotis = localInactiveUnifiedNotis.filter(noti => {
      const act = related.find(a => a.activity_id === noti.activity_id);
      if (!act) return false;
      return ['เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา', 'ผู้เข้าร่วมไม่ครบ'].includes(act.status);
    });

    localStorage.setItem('inactiveUnifiedNotifications', JSON.stringify(localInactiveUnifiedNotis));

    notifications = [...notifications.filter(n => n.type !== 'inactive-unified'), ...localInactiveUnifiedNotis];
    localStorage.setItem('notifications', JSON.stringify(notifications));

    renderNotificationPanel();
  } catch (e) {
    // Fail silently
  }
}

async function fetchAndCheckStatusChangeNotifications() {
  if (!token || !userId) return;
  try {
    const res = await fetch(`http://localhost:3000/api/user/activities`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    let all = data.activities;
    for (let act of all) {
      const resP = await fetch(`http://localhost:3000/api/user/activities/${act.activity_id}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      act.participants = await resP.json();
    }

    const related = all.filter(a => a.requester_id === userId || a.participants.some(p => p.user_id === userId));
    const prevStatus = JSON.parse(localStorage.getItem('activityPrevStatuses') || '{}');
    let localStatusChangeNotis = JSON.parse(localStorage.getItem('statusChangeNotifications') || '[]');

    for (let act of related) {
      const currentStatus = act.status;
      const previousStatus = prevStatus[act.activity_id];

      if (previousStatus && previousStatus !== currentStatus && isValidStatusTransition(previousStatus, currentStatus)) {
        const alreadyExists = localStatusChangeNotis.some(n =>
          n.activity_id === act.activity_id &&
          n.prevStatus === previousStatus &&
          n.status === currentStatus
        );

        if (!alreadyExists && !['เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา', 'ผู้เข้าร่วมไม่ครบ'].includes(currentStatus)) {
          const noti = createStatusChangeNotification(act, previousStatus, currentStatus);
          localStatusChangeNotis.push(noti);
        }

        if (['เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา', 'ผู้เข้าร่วมไม่ครบ'].includes(currentStatus)) {
          const noti = createStatusChangeNotification(act, previousStatus, currentStatus);
          localStatusChangeNotis.push(noti);
          delete prevStatus[act.activity_id];
        }
      }

      prevStatus[act.activity_id] = currentStatus;
    }

    const inactiveStatuses = ['เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา', 'ผู้เข้าร่วมไม่ครบ'];
    for (const act of related) {
      if (inactiveStatuses.includes(act.status)) {
        delete prevStatus[act.activity_id];
      }
    }

    localStorage.setItem('statusChangeNotifications', JSON.stringify(localStatusChangeNotis));
    localStorage.setItem('activityPrevStatuses', JSON.stringify(prevStatus));
    statusChangeNotifications = localStatusChangeNotis;
    renderNotificationPanel();
  } catch (e) {
    // Fail silently
  }
}

function isValidStatusTransition(oldStatus, newStatus) {
  const validTransitions = {
    'กำลังจะเริ่ม': ['กำลังทำกิจกรรม', 'ยกเลิก', 'ผู้เข้าร่วมไม่ครบ'],
    'กำลังทำกิจกรรม': ['รอผู้ขอยืนยันผล'],
    'รอผู้ขอยืนยันผล': ['รอการอนุมัติ', 'เกินเวลา'],
    'รอการอนุมัติ': ['เสร็จสิ้น'],
  };
  return validTransitions[oldStatus]?.includes(newStatus);
}

function setupNotifications() {
    injectNotificationUI();
    token = localStorage.getItem('token');
    userId = parseInt(localStorage.getItem('user_id'));
  
    renderNotificationPanel();
    fetchAndCheckNotifications(); // 🔵 Active unified
    fetchAndCheckInactiveUnifiedNotifications(); // 🟣 Inactive unified (called here ✅)
    fetchAndCheckStatusChangeNotifications(); // 🟡 Old → New status changes
  
    setInterval(fetchAndCheckNotifications, 60000);
    setInterval(fetchAndCheckInactiveUnifiedNotifications, 60000); // ✅ Auto-check every minute
    setInterval(fetchAndCheckStatusChangeNotifications, 60000);
  
    setupNotificationEvents();
  }
  

function setupNotificationEvents() {
  const bell = document.getElementById('notification-bell');
  const panel = document.getElementById('notification-panel');
  const clearBtn = document.getElementById('clear-notifications');
  const markReadBtn = document.getElementById('mark-read');

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !isHidden);
    bell.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  });

  markReadBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const activeStatuses = ['กำลังจะเริ่ม', 'กำลังทำกิจกรรม', 'รอผู้ขอยืนยันผล', 'รอการอนุมัติ'];

    statusChangeNotifications = statusChangeNotifications.map(n => ({ ...n, read: true }));
    inactiveUnifiedNotifications = inactiveUnifiedNotifications.map(n => ({ ...n, read: true }));
    notifications = notifications.map(n => {
      const isActive = activeStatuses.includes(n.status);
      if (!isActive && n.type !== 'inactive-unified') {
        return { ...n, read: true };
      }
      return n;
    });

    localStorage.setItem('notifications', JSON.stringify(notifications));
    localStorage.setItem('statusChangeNotifications', JSON.stringify(statusChangeNotifications));
    localStorage.setItem('inactiveUnifiedNotifications', JSON.stringify(inactiveUnifiedNotifications));
    renderNotificationPanel();
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    statusChangeNotifications = statusChangeNotifications.filter(n => !n.read);

    const toClearInactiveIds = inactiveUnifiedNotifications.filter(n => n.read).map(n => n.id);
    clearedInactiveUnifiedIds = [...new Set([...clearedInactiveUnifiedIds, ...toClearInactiveIds])];
    localStorage.setItem('clearedInactiveUnifiedIds', JSON.stringify(clearedInactiveUnifiedIds));
    inactiveUnifiedNotifications = inactiveUnifiedNotifications.filter(n => !n.read);

    const activeStatuses = ['กำลังจะเริ่ม', 'กำลังทำกิจกรรม', 'รอผู้ขอยืนยันผล', 'รอการอนุมัติ'];
    notifications = notifications.filter(n => {
      const isActive = activeStatuses.includes(n.status);
      if (n.type === 'inactive-unified') return true;
      return !(n.read && !isActive);
    });

    localStorage.setItem('notifications', JSON.stringify(notifications));
    localStorage.setItem('statusChangeNotifications', JSON.stringify(statusChangeNotifications));
    localStorage.setItem('inactiveUnifiedNotifications', JSON.stringify(inactiveUnifiedNotifications));
    renderNotificationPanel();
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !bell.contains(e.target)) {
      panel.classList.add('hidden');
      bell.setAttribute('aria-expanded', 'false');
    }
  });
}

document.addEventListener('DOMContentLoaded', setupNotifications);