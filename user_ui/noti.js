let token = null;
let userId = null;
let notifications = [];

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
  bellContainer.className = 'absolute right-0 top-0 mr-4 z-50';
  bellContainer.innerHTML = `
    <button id="notification-bell" class="relative focus:outline-none">
      <i class="fas fa-bell text-white text-2xl"></i>
      <span id="notification-count" class="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1 hidden">0</span>
    </button>
    <div id="notification-panel" class="hidden absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg max-h-96 overflow-y-auto ring-1 ring-black ring-opacity-5">
      <div class="p-4 border-b font-semibold text-gray-700 flex justify-between items-center">
        <span>การแจ้งเตือน</span>
        <button id="clear-notifications" class="text-sm text-red-600 hover:underline">ล้างทั้งหมด</button>
      </div>
      <ul id="notification-list" class="divide-y divide-gray-200"></ul>
      <div id="no-notifications" class="p-4 text-center text-gray-500 italic hidden">ไม่มีการแจ้งเตือนใหม่</div>
    </div>`;
  const headerBar = document.querySelector('.relative.mb-10') || document.body;
  headerBar.appendChild(bellContainer);
}

function formatOffset(offsetMs) {
  if (offsetMs >= 86400000) return `${offsetMs / 86400000} วัน`;
  if (offsetMs >= 3600000) return `${offsetMs / 3600000} ชั่วโมง`;
  if (offsetMs >= 60000) return `${offsetMs / 60000} นาที`;
  return '';
}

function formatDateToThai(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear() + 543;
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${d}/${m}/${y} (${h}:${min} น.)`;
}

function formatActivityDuration(startDate, startTime, endDate, endTime) {
  if (!startDate || !startTime || !endDate || !endTime) return 'เวลาผิดพลาด';
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'เวลาผิดพลาด';
  return `${formatDateToThai(start)} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')} น.`;
}

function generateNotificationHTML(activity, status, prevStatus = null, description = '') {
  const location = activity.location || 'ไม่ระบุ';
  const timeStr = formatActivityDuration(activity.start_date, activity.start_time, activity.end_date, activity.end_time);
  const statusChange = prevStatus && prevStatus !== status;

  return `
<div class="text-sm text-gray-700">
  <div class="font-semibold"><i class='fas fa-clipboard-list text-blue-700 mr-1'></i> ${activity.title}${statusChange ? ` มีการเปลี่ยนสถานะ` : ''}</div>
  <div class="text-xs text-gray-700 mt-2 leading-relaxed">
    <div><i class="fas fa-map-marker-alt mr-1 text-red-500"></i>สถานที่: ${location}</div>
    <div class="mt-1"><i class="fas fa-calendar-alt mr-1 text-gray-500"></i>${timeStr}</div>
    <div class="mt-2 flex items-center gap-2">
      ${statusChange ? `<span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[prevStatus] || 'bg-gray-400'}">${prevStatus}</span><span class="text-xs">→</span>` : ''}
      <span class="px-2 py-1 text-white text-xs rounded-full ${statusColor[status] || 'bg-gray-600'}">${status}</span>
    </div>
    <div class="mt-2 text-gray-500">${description || 'โปรดตรวจสอบรายละเอียดกิจกรรม'}</div>
  </div>
</div>
`;
}

function createUnifiedNotification(activity, prevStatus = null) {
  const message = generateNotificationHTML(
    activity,
    activity.status,
    prevStatus,
    prevStatus && prevStatus !== activity.status ? 'โปรดตรวจสอบรายละเอียดกิจกรรม' : `${activity.title} กำลังจะเริ่ม`
  );
  return {
    activity_id: activity.activity_id,
    title: `กิจกรรม "${activity.title}"`,
    message,
    timestamp: new Date().toISOString(),
    read: false,
    link: activity.requester_id === userId ? `myactivity-details.html?id=${activity.activity_id}` : `activity-details.html?id=${activity.activity_id}`,
    status: activity.status
  };
}

function renderNotificationPanel() {
  const list = document.getElementById('notification-list');
  const count = document.getElementById('notification-count');
  const noNotif = document.getElementById('no-notifications');
  notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  list.innerHTML = '';
  let unread = 0;
  notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  notifications.forEach(n => {
    const li = document.createElement('li');
    li.className = `p-3 cursor-pointer ${n.read ? 'opacity-60' : ''}`;
    li.innerHTML = `${n.message}<div class='text-xs text-gray-400 mt-1'>${new Date(n.timestamp).toLocaleString('th-TH')}</div>`;
    li.onclick = () => {
      n.read = true;
      localStorage.setItem('notifications', JSON.stringify(notifications));
      renderNotificationPanel();
      if (n.link) location.href = n.link;
    };
    list.appendChild(li);
    if (!n.read) unread++;
  });
  count.textContent = unread;
  count.classList.toggle('hidden', unread === 0);
  noNotif.classList.toggle('hidden', notifications.length > 0);
}

function setupNotificationEvents() {
  const bell = document.getElementById('notification-bell');
  const panel = document.getElementById('notification-panel');
  const clearBtn = document.getElementById('clear-notifications');
  bell.onclick = () => panel.classList.toggle('hidden');
  clearBtn.onclick = () => {
    localStorage.setItem('notifications', '[]');
    renderNotificationPanel();
  };
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !bell.contains(e.target)) {
      panel.classList.add('hidden');
    }
  });
}

async function fetchAndCheckNotifications() {
  const res = await fetch(`http://localhost:3000/api/user/activities`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const activeStatuses = ['กำลังจะเริ่ม', 'กำลังทำกิจกรรม', 'รอผู้ขอยืนยันผล', 'รอการอนุมัติ'];
  let all = data.activities.filter(a => activeStatuses.includes(a.status));
  for (let act of all) {
    const resP = await fetch(`http://localhost:3000/api/user/activities/${act.activity_id}/participants`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    act.participants = await resP.json();
  }
  const related = all.filter(a => a.requester_id === userId || a.participants.some(p => p.user_id === userId));
  const prevStatus = JSON.parse(localStorage.getItem('activityPrevStatuses') || '{}');
  let localNotis = JSON.parse(localStorage.getItem('notifications') || '[]');
  let updated = false;

  // Always keep only one message per activity
  const newNotis = [];
  for (let act of related) {
    const n = createUnifiedNotification(act, prevStatus[act.activity_id]);
    const existingIndex = localNotis.findIndex(x => x.activity_id === act.activity_id);
    if (existingIndex !== -1) {
      localNotis[existingIndex] = n;
    } else {
      localNotis.push(n);
    }
    prevStatus[act.activity_id] = act.status;
    updated = true;
  }

  if (updated) localStorage.setItem('notifications', JSON.stringify(localNotis));
  localStorage.setItem('activityPrevStatuses', JSON.stringify(prevStatus));
  renderNotificationPanel();
}

function setupNotifications() {
  injectNotificationUI();
  token = localStorage.getItem('token');
  userId = parseInt(localStorage.getItem('user_id'));
  renderNotificationPanel();
  fetchAndCheckNotifications();
  setInterval(fetchAndCheckNotifications, 60000);
  setupNotificationEvents();
}

document.addEventListener('DOMContentLoaded', setupNotifications);
