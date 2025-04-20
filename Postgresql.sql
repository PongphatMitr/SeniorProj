-- Drop existing tables if they exist
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS member_skills CASCADE;
DROP TABLE IF EXISTS community_fund CASCADE;
DROP TABLE IF EXISTS activity_participants CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS community_config CASCADE;
DROP TABLE IF EXISTS contact_us CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS community_config_log CASCADE;
DROP TABLE IF EXISTS user_login_log CASCADE;
DROP TABLE IF EXISTS user_transaction_transfer CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Drop enum types if they exist (run this first)
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS activity_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;

-- Create enum types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_approval', 'offline');

-- Create the activity_status enum type
CREATE TYPE activity_status AS ENUM (
    'กำลังทำกิจกรรม', 'รอผู้ขอยืนยันผล','รอการอนุมัติ', 'กำลังจะเริ่ม', 'เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา', 'ผู้เข้าร่วมไม่ครบ'
);

CREATE TYPE transaction_type AS ENUM ('earn', 'spend');

-- Create the branches table
CREATE TABLE branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create the projects table
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create the users table with enum status
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(50) NOT NULL CHECK (role IN ('User', 'Member', 'TimeBankManager', 'Admin')),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    branch_id INT,
    time_credits INT DEFAULT 0,
    status user_status DEFAULT 'active' NOT NULL, -- Changed to enum type
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

-- Create the new activities table
CREATE TABLE activities (
    activity_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_date DATE NOT NULL,
    end_time TIME NOT NULL,
    max_participants INT NOT NULL CHECK (max_participants > 0),
    requester_id INT NOT NULL,
    requester_phone VARCHAR(20) NOT NULL,
    status activity_status NOT NULL,
    time_tokens_required INT DEFAULT 0,
    time_tokens_per_participant INT DEFAULT 0,
    required_skills INT NOT NULL,
    confirmation_pending BOOLEAN DEFAULT false, -- ✅ NEW
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create the categories table
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create the skills table
CREATE TABLE skills (
    skill_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Create the member_skills table to handle top 3 skills for each user
CREATE TABLE member_skills (
    user_id INT PRIMARY KEY,
    skill_1 INT,
    skill_2 INT,
    skill_3 INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (skill_1) REFERENCES skills(skill_id),
    FOREIGN KEY (skill_2) REFERENCES skills(skill_id),
    FOREIGN KEY (skill_3) REFERENCES skills(skill_id)
);

-- Create the community_fund table
CREATE TABLE community_fund (
    fund_id SERIAL PRIMARY KEY,
    total_hours INT DEFAULT 0,
    borrowed_hours INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create the activity_participants table to handle many-to-many relationship between activities and users
CREATE TABLE activity_participants (
    activity_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (activity_id, user_id),
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create the exchange_rates table
CREATE TABLE exchange_rates (
    rate_id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create the community_config table
CREATE TABLE community_config (
    config_id SERIAL PRIMARY KEY,
    default_time_token INT DEFAULT 100,
    default_exchange_rate_id INT,
    minimum_time_token_hours INT DEFAULT 0, -- Added new column for minimum time token hours
    minimum_time_token_minutes INT DEFAULT 0, -- Added new column for minimum time token minutes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (default_exchange_rate_id) REFERENCES exchange_rates(rate_id)
);

-- Create the community_config_log table to log changes to community_config
CREATE TABLE community_config_log (
    log_id SERIAL PRIMARY KEY,
    config_id INT NOT NULL,
    changed_by INT NOT NULL,
    change_description TEXT NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (config_id) REFERENCES community_config(config_id),
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
);

-- Create the user_login_log table to log user login activities
CREATE TABLE user_login_log (
    log_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    login_time TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create the contact_us table
CREATE TABLE contact_us (
    contact_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create the user_transaction_transfer table
CREATE TABLE user_transaction_transfer (
    transaction_id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    time_credit INT NOT NULL CHECK (time_credit > 0), -- Only positive transfers
    transaction_type VARCHAR(50) NOT NULL, -- Added transaction_type column
    sender_balance INT NOT NULL,
    recipient_balance INT NOT NULL,
    date TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (sender_id) REFERENCES users(user_id),
    FOREIGN KEY (recipient_id) REFERENCES users(user_id)
);

-- Create the transactions table
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    activity_id INT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    time_credits INT NOT NULL,
    transaction_type transaction_type NOT NULL, -- Changed to use enum type
    details TEXT,
    requester_id INT,
    participant_id INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id),
    FOREIGN KEY (requester_id) REFERENCES users(user_id),
    FOREIGN KEY (participant_id) REFERENCES users(user_id)
);

-- Create the announcements table
CREATE TABLE announcements (
    announcement_id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL, -- Added description column
    image BYTEA NOT NULL,
    branch_id INT NOT NULL,
    project_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

-- Insert initial data into branches
INSERT INTO branches (branch_name) VALUES ('Test Branch'), ('โคกสลุง');

-- Insert initial data into projects
INSERT INTO projects (project_name, description) VALUES ('โครงการพลเมืองอาสามูลนิธิอาสาสมัครเพื่อสังคม', 'A volunteer project for community service.');

-- Insert initial data into announcements
INSERT INTO announcements (date, title, description, image, branch_id, project_id) VALUES 
('2023-01-01', 'Community Cleanup Activity', 'Join us for a community cleanup event to keep our neighborhood clean and green.', decode('89504e470d0a1a0a0000000d494844520000000100000001080200000090770d0b0000000a49444154789c6360000000020001ff', 'hex'), 1, 1);

-- Insert initial data into exchange_rates
INSERT INTO exchange_rates (description) VALUES ('1 โทเคนเวลา ต่อ 1 ชั่วโมง'), ('1 โทเคนเวลา ต่อ 1 กิจกรรม');

-- Insert initial data into community_config
INSERT INTO community_config (default_time_token, default_exchange_rate_id, minimum_time_token_hours, minimum_time_token_minutes) VALUES (100, 1, 0, 20);

-- Insert initial data into users
INSERT INTO users (username, password, email, role, name, phone, address, branch_id, time_credits, status) VALUES 
('testuser', '$2a$10$y2yR9UyFAUfyYCiYqDxgteWBflWnsbYdlFZDmNPmn7P1.xUfbRFtu', 'testuser@example.com', 'Member', 'Test User', '1234567890', '123 Test St, Test City', 1, 10, 'active'),
('earth', '$2a$10$1YbqGWj36sZXoKaXWvV/p.XaSkLSjBy.Xqiw41OPh9NeVTsp4qPpG', 'testuser@example.com', 'Member', 'กฤชนพัต จุลจู', '0822544153', '123 Test St, Test City ลพบุรี', 1, 10, 'active'),
('moji', '$2a$10$AfvWwUB3xPrYByh4UEpSSeptvKp07aIACEyzVJB4TJVRUM8aDNwWm', 'testuser@example.com', 'Member', 'ณิชาภา เกษมวงศ์', '0811111111', '123 Test St, Test City ลพบุรี', 1, 10, 'active'),
('save001', '$2a$10$4tEtE.kQJrXrM2G5w.8Fs.PWVcMz/WeE0iZSfPPdxz0DTY82mVOTy', 'savewaris001@gmail.com', 'Admin', 'Test User', '1234567890', '123 Test St, Test City', 1, 10, 'active'),
('save002', '$2a$10$4tEtE.kQJrXrM2G5w.8Fs.PWVcMz/WeE0iZSfPPdxz0DTY82mVOTy', 'savewaris001@gmail.com', 'Member', 'Test User', '1234567890', '123 Test St, Test City', 1, 10, 'active');

-- Insert initial data into activities (with required_skills)
INSERT INTO activities (title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_id, requester_phone, status, time_tokens_required, time_tokens_per_participant, required_skills) VALUES 
('กิจกรรมทำความสะอาดชุมชน', 'ทำความสะอาดชุมชน', 'Community Center', '2023-01-01', '09:00', '2023-01-01', '12:00', 20, 1, '1234567890', 'เกินเวลา', 20, 1, 4),
('กิจกรรมสอนคอมพิวเตอร์', 'สอนคอมพิวเตอร์ให้กับชุมชน', 'Community Center', '2023-01-15', '10:00', '2023-01-15', '13:00', 15, 1, '0987654321', 'เกินเวลา', 15, 1, 5),
('กิจกรรมทำอาหาร', 'ทำอาหารร่วมกัน', 'Community Kitchen', '2023-01-30', '11:00', '2023-01-30', '14:00', 10, 1, '0987654321', 'เสร็จสิ้น', 10, 1, 6),
('กิจกรรมทำสวน', 'ทำสวนร่วมกัน', 'Community Garden', '2023-02-05', '08:00', '2023-02-05', '11:00', 25, 1, '0987654321', 'เสร็จสิ้น', 25, 1, 7);

-- Insert initial data into categories
INSERT INTO categories (category) VALUES 
('งานซ่อมบำรุงเบื้องต้น'), 
('งานอำนวยความสะดวก/ส่งเสริมความสัมพันธ์'), 
('งานนันทนาการ'), 
('งานส่งเสริมความรู้,ให้คำปรึกษา,คำแนะนำ'), 
('งานบ้าน/งานครัว'), 
('งานเกษตร'), 
('อื่นๆ');

-- Insert initial data into skills
INSERT INTO skills (name, category_id) VALUES 
('ซ่อมแซมบ้าน', 1), 
('งานทาสี', 1), 
('ซ่อมอุปกรณ์เครื่องใช้ไฟฟ้า', 1), 
('ซ่อมไฟ/ซ่อมอุปกรณ์ไฟฟ้าขนาดใหญ่', 1), 
('ซ่อมประปา', 1), 
('ซ่อมรถ', 1), 
('เย็บ/ปัก/ถัก/ร้อย', 1), 
('ขับรถรับ-ส่ง', 2), 
('ดูแลเด็ก/ผู้ป่วย/ผู้สูงอายุ/ผู้พิการ', 2), 
('ช่วยขนย้ายของ', 2), 
('ฝากเลี้ยงสัตว์/ให้อาหารสัตว์เลี้ยง', 2), 
('ฝากบ้าน/เฝ้าบ้าน', 2), 
('ช่วยจับจ่ายซื้อของ', 2), 
('ช่วยงานเอกสาร/งานพิมพ์', 2), 
('เป็นเพื่อน รับ-ส่ง', 2), 
('เป็นเพื่อนรอที่โรงพยาบาล', 2), 
('พิธีกร/นำสวดมนต์', 3), 
('จัดกิจกรรมพัฒนาสมอง', 3), 
('ออกกำลังกาย/แอโรบิค/โยคะ', 3), 
('นวดเพื่อสุขภาพ', 3), 
('เล่นดนตรี/ร้องเพลง/รำวงในงานเทศกาล', 3), 
('เล่านิทาน/เล่าตำนานท้องถิ่น', 3), 
('สอนพิเศษ/สอนการบ้าน', 4), 
('ความรู้ด้านสิ้งประดิษฐ์', 4), 
('ความรู้ด้านดนตรี/สอนรำ', 4), 
('ความรู้ด้านทำอาหาร/ทำขนม', 4), 
('ความรู้ด้านการออกกำลังกาย', 4), 
('ความรู้ด้านอิเล็คทรอนิกส์/คอมพิวเตอร์', 4), 
('ความรู้ด้านกฏหมาย', 4), 
('ความรู้ด้านสุขภาพ', 4), 
('ความรู้ด้านปุ๋ยหมัก', 4), 
('ความรู้ด้านการหมัก', 4), 
('ทำงานบ้าน', 5), 
('ทำอาหาร', 5), 
('ทำขนม', 5), 
('ทำเครื่องดื่ม', 5), 
('ตกแต่งบ้าน', 5), 
('ซัก/รีดเสื้อผ้า', 5), 
('รดน้ำต้นไม้', 6), 
('ตัดต้นไม้', 6), 
('ตัดหญ้า', 6), 
('ปลูกต้นไม้', 6), 
('ปลูกผักสวนครัว', 6), 
('ทำสวน', 6), 
('แต่งสวน', 6), 
('อื่นๆ (ระบุความสามารถเอง)', 7);

-- Insert initial data into member_skills
INSERT INTO member_skills (user_id, skill_1, skill_2, skill_3) VALUES 
(1, 1, 2, 3), 
(2, 1, 2, 3);

-- Insert initial data into activity_participants
INSERT INTO activity_participants (activity_id, user_id) VALUES 
(1, 1), 
(2, 1), 
(3, 1), 
(4, 1);

-- Insert initial data into community_fund
INSERT INTO community_fund (total_hours, borrowed_hours) VALUES 
(200, 50);

-- Insert initial data into contact_us
INSERT INTO contact_us (name, email, subject, message) VALUES 
('John Doe', 'john.doe@example.com', 'Inquiry about activities', 'I would like to know more about the upcoming community activities.'),
('Jane Smith', 'jane.smith@example.com', 'Volunteer Opportunities', 'How can I volunteer for the community events?'),
('Alice Johnson', 'alice.johnson@example.com', 'Feedback on Website', 'The website is very user-friendly. Great job!'),
('Bob Brown', 'bob.brown@example.com', 'Issue with Login', 'I am having trouble logging into my account. Can you help?');

-- Insert initial data into transactions
INSERT INTO transactions (user_id, activity_id, date, time, time_credits, transaction_type, details, requester_id, participant_id, created_at, updated_at) VALUES 
(1, 1, '2023-01-01', '09:00:00', 1, 'earn', 'Participated in activity: กิจกรรมทำความสะอาดชุมชน', 1, 1, '2025-01-29 15:46:29.868674', '2025-01-29 15:46:29.868674');

-- Add attended column to activity_participants table
ALTER TABLE activity_participants ADD COLUMN attended BOOLEAN DEFAULT false;

INSERT INTO activities (
    title,
    description,
    location,
    start_date,
    start_time,
    end_date,
    end_time,
    max_participants,
    requester_id,
    requester_phone,
    status,
    time_tokens_required,
    time_tokens_per_participant,
    required_skills
) VALUES (
	    'กิจกรรมเช็คคอนเฟิมรายชื่อตอนเสร็จสิ้น',
    'เริ่มเมื่อ 1 ชั่วโมงก่อนเวลานี้ และจะจบอีกชั่วโมงถัดมา',
    'Test Location',
    CURRENT_DATE,  -- or CURRENT_DATE - INTERVAL '1 day' if you want it backdated
    to_char(NOW() - INTERVAL '1 hour', 'HH24:MI')::time,
    CURRENT_DATE,
    to_char(NOW() + INTERVAL '1 minute', 'HH24:MI')::time,  -- end time = now (1 hour after start)
    10,
    2,
    '0123456789',
    'กำลังจะเริ่ม',
    5,
    1,
    1
);

INSERT INTO activities (
    title,
    description,
    location,
    start_date,
    start_time,
    end_date,
    end_time,
    max_participants,
    requester_id,
    requester_phone,
    status,
    time_tokens_required,
    time_tokens_per_participant,
    required_skills
) VALUES (
    'กิจกรรมเช็คคอนเฟิมรายชื่อตอนยังไม่เสร็จ	',
    'เริ่มเมื่อ 1 นาทีที่แล้ว และสิ้นสุดอีก 1 ชั่วโมงถัดมา',
    'Test Location',
    CURRENT_DATE,
    to_char(NOW() - INTERVAL '1 minute', 'HH24:MI')::time,
    CURRENT_DATE,
    to_char(NOW() + INTERVAL '59 minute', 'HH24:MI')::time,  -- 1 hour after start
    10,
    2,
    '0123456789',
    'กำลังจะเริ่ม',
    5,
    1,
    1
);

INSERT INTO activities (
    title,
    description,
    location,
    start_date,
    start_time,
    end_date,
    end_time,
    max_participants,
    requester_id,
    requester_phone,
    status,
    time_tokens_required,
    time_tokens_per_participant,
    required_skills
) VALUES (
    'กิจกรรมเมื่อวานใกล้จะเกินเวลา',
    'จะกลายเป็นเกินเวลาอีก 1 นาที หลังจากวันสิ้นสุด + เวลา + 1 นาที',
    'Test Location',
    CURRENT_DATE - INTERVAL '1 day',
    to_char(NOW() - INTERVAL '2 hour', 'HH24:MI')::time,       -- started 2 hrs ago yesterday
    CURRENT_DATE - INTERVAL '1 day',
    to_char(NOW() + INTERVAL '1 minute', 'HH24:MI')::time,     -- ends in 1 min from now (yesterday)
    10,
    2,
    '0123456789',
    'กำลังจะเริ่ม',
    5,
    1,
    1
);


INSERT INTO activity_participants (
    activity_id,
    user_id
) VALUES (
    5,
    3
);
INSERT INTO activity_participants (
    activity_id,
    user_id
) VALUES (
    6,
    1
);
INSERT INTO activity_participants (
    activity_id,
    user_id
) VALUES (
    7,
    1
);

INSERT INTO activities (
    title,
    description,
    location,
    start_date,
    start_time,
    end_date,
    end_time,
    max_participants,
    requester_id,
    requester_phone,
    status,
    time_tokens_required,
    time_tokens_per_participant,
    required_skills
) VALUES (
    'ทดสอบเปลี่ยนจากกำลังจะเริ่มเป็นกำลังทำกิจกรรม',
    'กิจกรรมนี้จะเริ่มภายใน 1 นาทีและยาว 1 ชั่วโมง',
    'สถานที่ทดสอบ',
    CURRENT_DATE,
    to_char(NOW() + INTERVAL '1 minute', 'HH24:MI')::time,  -- start in 30 sec
    CURRENT_DATE,
    to_char(NOW() + INTERVAL '1 hour 30 seconds', 'HH24:MI')::time, -- 1hr after start
    10,
    2,
    '0812345678',
    'กำลังจะเริ่ม',
    5,
    1,
    1
);


UPDATE activities
SET status = CASE
    WHEN status IN ('กำลังจะเริ่ม', 'กำลังทำกิจกรรม')
         AND (start_date::timestamp + start_time) <= NOW()
         AND (end_date::timestamp + end_time) >= NOW()
        THEN 'กำลังทำกิจกรรม'
    WHEN status IN ('กำลังทำกิจกรรม', 'กำลังจะเริ่ม')
         AND (end_date::timestamp + end_time) < NOW()
         AND (end_date::timestamp + end_time + INTERVAL '1 day') >= NOW()
        THEN 'รอผู้ขอยืนยันผล'
    WHEN status = 'รอผู้ขอยืนยันผล'
         AND (end_date::timestamp + end_time + INTERVAL '1 day') < NOW()
        THEN 'เกินเวลา'
    ELSE status
END,
updated_at = NOW()
WHERE
    (status IN ('กำลังจะเริ่ม', 'กำลังทำกิจกรรม')
     AND (start_date::timestamp + start_time) <= NOW()
     AND (end_date::timestamp + end_time) >= NOW())
    OR
    (status IN ('กำลังทำกิจกรรม', 'กำลังจะเริ่ม')
     AND (end_date::timestamp + end_time) < NOW()
     AND (end_date::timestamp + end_time + INTERVAL '1 day') >= NOW())
    OR
    (status = 'รอผู้ขอยืนยันผล'
     AND (end_date::timestamp + end_time + INTERVAL '1 day') < NOW());
	 