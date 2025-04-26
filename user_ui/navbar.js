function updateSidebar(isLoggedIn) {
  const navList = document.getElementById('navList');
  if (!navList) {
    console.error('navList element not found.');
    return;
  }
  const sidebarHeader = `
<div class="flex items-center mb-10">
 <img alt="Logo of Time Bank System, a clock with a handshake in the center" class="w-10 h-10 rounded-full" height="50" src="https://storage.googleapis.com/a1aa/image/46a069e1-42da-4026-cc3e-922c4d36ecaa.jpg" width="50"/>
 <span class="ml-3 text-xl font-bold text-blue-600">
  TIMEBANK
 </span>
</div>
`;

  // Helper to get current path filename
  function getCurrentPage() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf('/') + 1);
  }

  // Save dropdown states in localStorage to persist open state across page loads
  function getDropdownState(id) {
    const state = localStorage.getItem('dropdown-' + id);
    return state === 'true';
  }
  function setDropdownState(id, state) {
    localStorage.setItem('dropdown-' + id, state ? 'true' : 'false');
  }

  function createDropdown(id, title, iconClass, items) {
    const currentPage = getCurrentPage();
    let isOpen = getDropdownState(id);

    // Auto-open dropdown if current page matches any item
    if (!isOpen) {
      isOpen = items.some(item => item.href === currentPage);
      if (isOpen) setDropdownState(id, true);
    }

    return `
<li class="mb-4">
 <button aria-controls="${id}" aria-expanded="${isOpen}" class="flex items-center justify-between w-full text-gray-700 hover:text-blue-600 hover:bg-gray-100 p-2 rounded-lg transition focus:outline-none" onclick="toggleDropdown('${id}', this)">
  <span class="flex items-center">
   <i class="${iconClass} mr-3 w-5"></i>
   ${title}
  </span>
  <i class="fas fa-chevron-left transition-transform duration-300 transform ${isOpen ? 'rotate-[-90deg]' : 'rotate-0'}"></i>
 </button>
 <ul class="ml-8 transition-all duration-300 ease-in-out space-y-3" id="${id}" style="height: ${isOpen ? `${items.length * 48 + 12}px` : '0'}; overflow: hidden; visibility: ${isOpen ? 'visible' : 'hidden'};">
  ${items.map((item, index) => {
      const active = item.href === currentPage;
      const activeClass = active
        ? 'bg-blue-100 text-blue-700 font-semibold'
        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100';
      return `
  <li class="${index === 0 ? 'mt-3' : ''}">
   <a class="flex items-center p-2 rounded-lg transition ${activeClass}" href="${item.href}">
    <i class="${item.icon} mr-3 w-4"></i>
    ${item.text}
   </a>
  </li>
  `;
    }).join('')}
 </ul>
</li>
    `;
  }


  if (isLoggedIn) {
    (async () => {
      let profileData = {};
      try {
        const token = localStorage.getItem('token');
        try {
          const profileResponse = await fetch('http://localhost:3000/api/tbm/auth/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (profileResponse.ok) {
            profileData = await profileResponse.json();
          }
        } catch (err) {
          console.error('Failed to fetch profile for sidebar:', err);
        }

        const response = await fetch('http://localhost:3000/api/user/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch user details');
        }
        const member = await response.json();
        const memberId = member.userId || member.user_id;

        localStorage.setItem('user_id', memberId);

        navList.innerHTML = `
${sidebarHeader}
<li class="mb-5 flex items-center justify-between">
  <a class="flex items-center hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300 flex-grow" href="log-out.html">
    <i class="fas fa-user mr-3 text-blue-600"></i>
<span class="text-blue-600 font-bold">${profileData.name || 'โปรไฟล์'}</span>
  </a>
  <button aria-label="Logout" class="text-red-600 hover:text-red-800 p-2 rounded transition duration-300" onclick="showLogoutModal()">
    <i class="fas fa-sign-out-alt"></i>
  </button>
</li>
<li class="mb-4">
 <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-100 p-2 rounded-lg transition ${getCurrentPage() === 'homepage.html' ? 'bg-blue-100 text-blue-700 font-semibold' : ''}" href="homepage.html">
  <i class="fas fa-home mr-3 w-5"></i>
  หน้าหลัก
 </a>
</li>
${createDropdown('community-dropdown', 'กิจกรรมทั้งหมด', 'fas fa-users', [
          { href: 'service.html', text: 'กิจกรรมของชุมชน', icon: 'fas fa-users' },
          { href: 'history.html', text: 'ธุรกรรมเวลา', icon: 'fas fa-history' },
          { href: 'create-service.html', text: 'สร้างกิจกรรม', icon: 'fas fa-plus-circle' }
        ])}
${createDropdown('management-dropdown', 'การจัดการของฉัน', 'fas fa-cogs', [
          { href: 'profile.html', text: 'จัดการข้อมูลส่วนตัว', icon: 'fas fa-user-edit' },
          { href: 'transfer.html', text: 'แลกเปลี่ยนเวลา', icon: 'fas fa-exchange-alt' },
          { href: 'balance.html', text: 'ยอดคงเหลือ', icon: 'fas fa-wallet' }
        ])}
<li class="mb-4">
 <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-100 p-2 rounded-lg transition ${getCurrentPage() === 'contact.html' ? 'bg-blue-100 text-blue-700 font-semibold' : ''}" href="contact.html">
  <i class="fas fa-phone-alt mr-3 w-5"></i>
  ติดต่อเรา
 </a>
</li>
        `;

      } catch (error) {
        console.error('Error fetching user details:', error);
        alert('เกิดข้อผิดพลาดขณะโหลดข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      }
    })();
  } else {
    navList.innerHTML = `
${sidebarHeader}
<li class="mb-5">
 <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="log-in.html">
  <i class="fas fa-sign-in-alt mr-3"></i>
  เข้าสู่ระบบ
 </a>
</li>
<li class="mb-5">
 <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="homepage.html">
  <i class="fas fa-home mr-3"></i>
  หน้าหลัก
 </a>
</li>
    `;
  }
}

function toggleDropdown(id, button) {
  const dropdown = document.getElementById(id);
  if (!dropdown) return;

  const isExpanded = button.getAttribute('aria-expanded') === 'true';
  const icon = button.querySelector('i.fas.fa-chevron-left');

  if (isExpanded) {
    // Collapse dropdown
    icon.classList.remove('rotate-[-90deg]');
    icon.classList.add('rotate-0');

    dropdown.style.height = '0';
    dropdown.style.visibility = 'hidden';

    button.setAttribute('aria-expanded', 'false');
    setDropdownState(id, false);
  } else {
    // Expand dropdown
    icon.classList.remove('rotate-0');
    icon.classList.add('rotate-[-90deg]');

    dropdown.style.height = dropdown.scrollHeight + 'px';
    dropdown.style.visibility = 'visible';

    button.setAttribute('aria-expanded', 'true');
    setDropdownState(id, true);
  }
}


function getDropdownState(id) {
  return localStorage.getItem('dropdown-' + id) === 'true';
}

function setDropdownState(id, state) {
  localStorage.setItem('dropdown-' + id, state ? 'true' : 'false');
}


async function checkLoginStatus() {
  const token = localStorage.getItem('token');
  const isLoginPage = window.location.pathname.endsWith('log-in.html');
  const isRegisterPage = window.location.pathname.endsWith('register.html') || window.location.pathname.endsWith('register-skill.html');
  if (token) {
    try {
      const response = await fetch('http://localhost:3000/api/user/auth/verify', {
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
        if (!isLoginPage && !isRegisterPage) {
          showErrorModal('Token verification failed. Redirecting to login page.');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      localStorage.removeItem('token');
      updateSidebar(false);
      if (!isLoginPage && !isRegisterPage) {
        showErrorModal('Error occurred during token verification. Redirecting to login page.');
      }
    }
  } else {
    updateSidebar(false);
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
  window.location.href = 'log-in.html';
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

document.addEventListener('DOMContentLoaded', () => {
  checkLoginStatus();

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
      window.location.href = 'log-in.html';
    });
  } else {
    console.error('Error confirmation or modal elements not found.');
  }
});