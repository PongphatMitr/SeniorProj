-- Drop existing tables if they exist
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

-- Drop enum types if they exist (run this first)
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS activity_status CASCADE;

-- Create enum types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_approval', 'offline');
CREATE TYPE activity_status AS ENUM ('กำลังจะเริ่ม', 'เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา');

-- Create the branches table
CREATE TABLE branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create the users table with enum status
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Member', 'TimeBankManager', 'Admin')),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    branch_id INT,
    time_credits INT DEFAULT 0,
    status user_status DEFAULT 'active' NOT NULL,  -- Changed to enum type
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

-- Create the activities table with enum status
CREATE TABLE activities (
    activity_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(100),
    start_date DATE NOT NULL,
    start_time TIME,
    end_date DATE NOT NULL,
    end_time TIME,
    max_participants INT,
    requester_id INT,
    status activity_status NOT NULL,  -- Changed to enum type
    time_tokens_required INT DEFAULT 0,
    time_tokens_per_participant INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (requester_id) REFERENCES users(user_id)
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

-- Create the member_skills table to handle many-to-many relationship between users and skills
CREATE TABLE member_skills (
    user_id INT NOT NULL,
    skill_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
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
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial data into branches
INSERT INTO branches (branch_name) VALUES 
('Test Branch');

-- Insert initial data into exchange_rates
INSERT INTO exchange_rates (description) VALUES 
('1 โทเคนเวลา ต่อ 1 ชั่วโมง'),
('1 โทเคนเวลา ต่อ 1 กิจกรรม');

-- Insert initial data into community_config
INSERT INTO community_config (default_time_token, default_exchange_rate_id) VALUES (100, 1);

-- Insert initial data into users
INSERT INTO users (username, password, email, role, name, phone, address, branch_id, time_credits, status) 
VALUES ('testuser', '$2a$10$y2yR9UyFAUfyYCiYqDxgteWBflWnsbYdlFZDmNPmn7P1.xUfbRFtu', 'testuser@example.com', 'Member', 'Test User', '1234567890', '123 Test St, Test City', 1, 10, 'active'),
        ('save001', '$2a$10$4tEtE.kQJrXrM2G5w.8Fs.PWVcMz/WeE0iZSfPPdxz0DTY82mVOTy', 'savewaris001@gmail.com', 'Admin', 'Test User', '1234567890', '123 Test St, Test City', 1, 10, 'active');

-- Insert initial data into activities
INSERT INTO activities (title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_id, status, time_tokens_required, time_tokens_per_participant) 
VALUES 
('กิจกรรมทำความสะอาดชุมชน', 'ทำความสะอาดชุมชน', 'Community Center', '2023-01-01', '09:00', '2023-01-01', '12:00', 20, 1, 'กำลังจะเริ่ม', 20, 1),
('กิจกรรมสอนคอมพิวเตอร์', 'สอนคอมพิวเตอร์ให้กับชุมชน', 'Community Center', '2023-01-15', '10:00', '2023-01-15', '13:00', 15, 1, 'กำลังจะเริ่ม', 15, 1),
('กิจกรรมทำอาหาร', 'ทำอาหารร่วมกัน', 'Community Kitchen', '2023-01-30', '11:00', '2023-01-30', '14:00', 10, 1, 'เสร็จสิ้น', 10, 1),
('กิจกรรมทำสวน', 'ทำสวนร่วมกัน', 'Community Garden', '2023-02-05', '08:00', '2023-02-05', '11:00', 25, 1, 'เสร็จสิ้น', 25, 1),
('กิจกรรมยกเลิก', 'กิจกรรมนี้ถูกยกเลิก', 'Community Center', '2023-02-20', '09:00', '2023-02-20', '12:00', 0, 1, 'ยกเลิก', 0, 0),
('กิจกรรมยกเลิก', 'กิจกรรมนี้ถูกยกเลิก', 'Community Center', '2023-02-25', '09:00', '2023-02-25', '12:00', 0, 1, 'ยกเลิก', 0, 0);

-- Insert initial data into categories
INSERT INTO categories (category) 
VALUES 
('ทั่วไป'),
('การศึกษา'),
('การทำอาหาร'),
('การเกษตร');

-- Insert initial data into skills
INSERT INTO skills (name, category_id) 
VALUES 
('การทำความสะอาด', 1),
('การสอนคอมพิวเตอร์', 2),
('การทำอาหาร', 3),
('การทำสวน', 4);

-- Insert initial data into member_skills
INSERT INTO member_skills (user_id, skill_id) 
VALUES 
(1, 1),
(1, 2),
(1, 3),
(1, 4);

-- Insert initial data into activity_participants
INSERT INTO activity_participants (activity_id, user_id) 
VALUES 
(1, 1),
(2, 1),
(3, 1),
(4, 1);

-- Insert initial data into community_fund
INSERT INTO community_fund (total_hours, borrowed_hours) VALUES (200, 50);