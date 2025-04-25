let token = null;
let userId = null;
let statusChangeNotifications = [];
let notifications = [];
let clearedNotificationIds = JSON.parse(localStorage.getItem('clearedNotificationIds') || '[]');


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
  
      // If times are provided separately (like "15:00:00"), override the time part
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
      'ยกเลิก': 'กิจกรรมนี้ถูกยกเลิก โปรดตรวจสอบรายละเอียด',
      'เสร็จสิ้น': 'กิจกรรมเสร็จสมบูรณ์ โปรดตรวจสอบเวลาแลกเปลี่ยน',
      'ผู้เข้าร่วมไม่ครบ': 'ไม่มีผู้เข้าร่วมครบตามที่กำหนด กิจกรรมถูกยกเลิก'
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
  

function createStatusChangeNotification(activity, oldStatus, newStatus) {
    const resolvedNewStatus = resolveStatusMapping(oldStatus, newStatus);
  
    // ✅ Use the same formatted time string like createUnifiedNotification
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
  
    const activeStatuses = ['กำลังจะเริ่ม', 'กำลังทำกิจกรรม', 'รอผู้ขอยืนยันผล', 'รอการอนุมัติ'];
  
    const getStartTimeMs = (n) => {
      const dateStr = n.start_date || (n.activity && n.activity.start_date);
      const timeStr = n.start_time || (n.activity && n.activity.start_time);
      if (!dateStr || !timeStr) return 0;
      return new Date(`${dateStr}T${timeStr}`).getTime();
    };
  
    const unifiedUnreadActive = [];
    const unifiedUnreadInactive = [];
    const unifiedReadInactive = [];
  
    for (const n of notifications) {
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
  
    // ✅ Declare before use
    let headerElements = [];
  
    const sectionHeader = (title, id) => {
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
      li.dataset.groupId = id;
  
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
        ${iconMap[id] || ''}
        <span>${labelMap[id] || title}</span>
      `;
  
      headerElements.push(li);
      return li;
    };
  
    const renderGroup = (title, notiList, groupId) => {
      if (notiList.length === 0) return;
      list.appendChild(sectionHeader(title, groupId));
  
      for (const n of notiList) {
        const isRead = n.read;
        const isInactive = !activeStatuses.includes(n.status);
        const isStatusChange = n.type === 'statuschange';
  
        const li = document.createElement('li');
        li.className = `p-3 cursor-pointer rounded-md transition hover:bg-gray-100 ${isRead ? 'opacity-60' : ''}`;
        li.innerHTML = `${n.message}<div class='text-xs text-gray-400 mt-1'>${formatRelativeTime(n.timestamp)}</div>`;
  
        li.onclick = () => {
          if (isStatusChange) {
            const idx = statusChangeNotifications.findIndex(x => x.id === n.id);
            if (idx !== -1) {
              statusChangeNotifications[idx].read = true;
              localStorage.setItem('statusChangeNotifications', JSON.stringify(statusChangeNotifications));
            }
          } else if (isInactive) {
            const idx = notifications.findIndex(x => x.id === n.id);
            if (idx !== -1) {
              notifications[idx].read = true;
              localStorage.setItem('notifications', JSON.stringify(notifications));
            }
          }
          renderNotificationPanel();
          if (n.link) location.href = n.link;
        };
  
        list.appendChild(li);
        if (!isRead) unread++;
      }
    };
  
    renderGroup('กิจกรรมของฉันที่กำลังดำเนินอยู่', unifiedUnreadActive, 'active');
    renderGroup('การเปลี่ยนแปลงของกิจกรรม', [...statusChangeUnread, ...statusChangeRead], 'statuschange');
    renderGroup('กิจกรรมอื่น ๆ ทั้งหมด', [...unifiedUnreadInactive, ...unifiedReadInactive], 'others');
  
    count.textContent = unread;
    count.classList.toggle('hidden', unread === 0);
    noNotif.classList.toggle('hidden', unread > 0);
  
    // Scroll highlight for sticky headers
    const panel = document.getElementById('notification-panel');
    panel.addEventListener('scroll', () => {
      let lastActive = null;
      for (const header of headerElements) {
        const rect = header.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const topOffset = rect.top - panelRect.top;
  
        if (topOffset <= 0) {
          lastActive = header;
        } else {
          header.classList.remove('bg-indigo-100', 'text-indigo-700');
          header.classList.add('bg-white/80', 'text-gray-800');
        }
      }
  
      if (lastActive) {
        headerElements.forEach(h => {
          h.classList.remove('bg-indigo-100', 'text-indigo-700');
          h.classList.add('bg-white/80', 'text-gray-800');
        });
        lastActive.classList.remove('bg-white/80', 'text-gray-800');
        lastActive.classList.add('bg-indigo-100', 'text-indigo-700');
      }
    });
  }
  
  
  

  function setupNotificationEvents() {
    const bell = document.getElementById('notification-bell');
    const panel = document.getElementById('notification-panel');
    const clearBtn = document.getElementById('clear-notifications');
    const markReadBtn = document.getElementById('mark-read');
  
    // Toggle visibility
    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = panel.classList.contains('hidden');
      panel.classList.toggle('hidden', !isHidden);
      bell.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });
  
    // 📖 อ่านทั้งหมด – mark as read only for specific sections (statuschange + others)
    markReadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
  
      const activeStatuses = ['กำลังจะเริ่ม', 'กำลังทำกิจกรรม', 'รอผู้ขอยืนยันผล', 'รอการอนุมัติ'];
  
      // ✅ Mark only read for statusChangeNotifications
      statusChangeNotifications = statusChangeNotifications.map(n => ({ ...n, read: true }));
  
      // ✅ Only mark as read for unified inactive notifications
      notifications = notifications.map(n => {
        const isActive = activeStatuses.includes(n.status);
        if (!isActive) {
          return { ...n, read: true };
        }
        return n; // leave active notifications untouched
      });
  
      localStorage.setItem('notifications', JSON.stringify(notifications));
      localStorage.setItem('statusChangeNotifications', JSON.stringify(statusChangeNotifications));
      renderNotificationPanel();
    });
  
    // 🗑️ ล้างทั้งหมด – clear only read statuschange + read inactive unified
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
  
      statusChangeNotifications = statusChangeNotifications.filter(n => !n.read);
  
      const activeStatuses = ['กำลังจะเริ่ม', 'กำลังทำกิจกรรม', 'รอผู้ขอยืนยันผล', 'รอการอนุมัติ'];
      notifications = notifications.filter(n => {
        const isActive = activeStatuses.includes(n.status);
        return !(n.read && !isActive); // remove only read + inactive
      });
  
      localStorage.setItem('notifications', JSON.stringify(notifications));
      localStorage.setItem('statusChangeNotifications', JSON.stringify(statusChangeNotifications));
      renderNotificationPanel();
    });
  
    // Auto-close panel when click outside
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
  
      // Fetch participants for each activity
      for (let act of all) {
        const resP = await fetch(`http://localhost:3000/api/user/activities/${act.activity_id}/participants`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        act.participants = await resP.json();
      }
  
      const related = all.filter(a =>
        a.requester_id === userId || a.participants.some(p => p.user_id === userId)
      );
  
      // Load local read state to avoid regenerating inactive notis
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
      
        if (isActive) {
          const noti = createUnifiedNotification(act);
          newNotis.push(noti); // ✅ always regenerate
        } else if (!alreadyStored) {
          const noti = createUnifiedNotification(act);
          newNotis.push(noti); // ✅ one-time add for inactive
        } else {
          newNotis.push(alreadyStored); // ✅ reuse existing with read:true if already viewed
        }
      }      
  
      localStorage.setItem('notifications', JSON.stringify(newNotis));
      notifications = newNotis;
      renderNotificationPanel();
    } catch (e) {
      console.error('⚠️ fetchAndCheckNotifications failed', e);
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
      
        // ✅ Only add if not already cleared
        if (!alreadyExists && !['เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา', 'ผู้เข้าร่วมไม่ครบ'].includes(currentStatus)) {
          const noti = createStatusChangeNotification(act, previousStatus, currentStatus);
          localStatusChangeNotis.push(noti);
        }
      
        // ✅ Allow one-time noti for inactive status, but remove it from prevStatus so it's not re-triggered
        if (['เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา', 'ผู้เข้าร่วมไม่ครบ'].includes(currentStatus)) {
          const noti = createStatusChangeNotification(act, previousStatus, currentStatus);
          localStatusChangeNotis.push(noti);
          delete prevStatus[act.activity_id]; // mark as done
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
  fetchAndCheckNotifications();
  fetchAndCheckStatusChangeNotifications();
  setInterval(fetchAndCheckNotifications, 60000);
  setInterval(fetchAndCheckStatusChangeNotifications, 60000);
  setupNotificationEvents();
}

document.addEventListener('DOMContentLoaded', setupNotifications);