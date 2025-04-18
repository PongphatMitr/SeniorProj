function updateSidebar(isLoggedIn) {
    const navList = document.getElementById('navList');
    if (!navList) {
        console.error('navList element not found.');
        return;
    }
    const sidebarHeader = `
    <div class="flex items-center mb-10">
      <img alt="Logo of Time Bank System, a clock with a handshake in the center" class="w-10 h-10 rounded-full" height="50" src="../images/timebank.png" width="50" />
      <span class="ml-3 text-xl font-bold text-blue-600"> TIMEBANK </span>
    </div>
  `;
    if (isLoggedIn) {
        (async () => {
            try {
                const response = await fetch('http://localhost:3000/api/user/auth/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch user details');
                }
                const member = await response.json();
                const memberId = member.userId || member.user_id;
                navList.innerHTML = `
          ${sidebarHeader}
          <li class="mb-5 flex items-center justify-between">
            <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300 flex-grow" href="log-out.html">
              <i class="fas fa-user mr-3"></i> โปรไฟล์
            </a>
            <button class="text-red-600 hover:text-red-800 p-2 rounded transition duration-300" onclick="showLogoutModal()" aria-label="Logout">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </li>
          <li class="mb-5">
            <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="homepage.html">
              <i class="fas fa-home mr-3"></i> หน้าหลัก
            </a>
          </li>
          <li class="mb-5">
            <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="service.html">
              <i class="fas fa-clipboard-list mr-3"></i> กิจกรรมชุมชน
            </a>
          </li>
          <li class="mb-5">
            <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="profile.html">
              <i class="fas fa-user-edit mr-3"></i> แก้ไขประวัติ
            </a>
          </li>
          <li class="mb-5">
            <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="skillconf.html">
              <i class="fas fa-tools mr-3"></i> แก้ไขทักษะ
            </a>
          </li>
          <li class="mb-5">
            <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="balance.html">
              <i class="fas fa-wallet mr-3"></i> ยอดคงเหลือ
            </a>
          </li>
          <li class="mb-5">
            <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="history.html">
              <i class="fas fa-history mr-3"></i> ประวัติการเข้าร่วมกิจกรรม
            </a>
          </li>
          <li class="mb-5">
            <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="transfer.html">
              <i class="fas fa-exchange-alt mr-3"></i> แลกเปลี่ยนเวลา
            </a>
          </li>
          <li class="mb-5">
            <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="contact.html">
              <i class="fas fa-phone mr-3"></i> ติดต่อเรา
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
          <i class="fas fa-sign-in-alt mr-3"></i> เข้าสู่ระบบ
        </a>
      </li>
      <li class="mb-5">
        <a class="flex items-center text-gray-700 hover:text-blue-600 hover:bg-gray-200 p-2 rounded transition duration-300" href="homepage.html">
          <i class="fas fa-home mr-3"></i> หน้าหลัก
        </a>
      </li>
    `;
    }
}

async function checkLoginStatus() {
    const token = localStorage.getItem('token');
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const isRegisterPage = window.location.pathname.endsWith('register.html');
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
            window.location.href = 'log-in.html';
        });
    } else {
        console.error('Error confirmation or modal elements not found.');
    }
});