-- Drop existing tables if they exist
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS member_skills CASCADE;
DROP TABLE IF EXISTS community_fund CASCADE;
DROP TABLE IF EXISTS activity_participants CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS community_config CASCADE;

-- Create the users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Member', 'TimeBankManager', 'Admin'))
);

-- Create the members table
CREATE TABLE members (
    member_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    branch VARCHAR(50),
    time_credits INT DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create the activities table
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
    status VARCHAR(20) NOT NULL CHECK (status IN ('กำลังจะเริ่ม', 'เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา')),
    time_tokens_required INT DEFAULT 0,
    time_tokens_per_participant INT DEFAULT 0,
    FOREIGN KEY (requester_id) REFERENCES members(member_id)
);

-- Create the categories table
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL
);

-- Create the skills table
CREATE TABLE skills (
    skill_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Create the member_skills table to handle many-to-many relationship between members and skills
CREATE TABLE member_skills (
    member_id INT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (member_id, skill_id),
    FOREIGN KEY (member_id) REFERENCES members(member_id),
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
);

-- Create the community_fund table
CREATE TABLE community_fund (
    fund_id SERIAL PRIMARY KEY,
    total_hours INT DEFAULT 0,
    borrowed_hours INT DEFAULT 0
);

-- Create the activity_participants table to handle many-to-many relationship between activities and members
CREATE TABLE activity_participants (
    activity_id INT NOT NULL,
    member_id INT NOT NULL,
    PRIMARY KEY (activity_id, member_id),
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id),
    FOREIGN KEY (member_id) REFERENCES members(member_id)
);

-- Create the transactions table
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    member_id INT NOT NULL,
    activity_id INT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    time_credits INT,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('earn', 'spend')),
    details TEXT,
    requester_id INT,
    participant_id INT,
    FOREIGN KEY (member_id) REFERENCES members(member_id),
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id),
    FOREIGN KEY (requester_id) REFERENCES members(member_id),
    FOREIGN KEY (participant_id) REFERENCES members(member_id)
);

-- Create the exchange_rates table
CREATE TABLE exchange_rates (
    rate_id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL
);

-- Create the community_config table
CREATE TABLE community_config (
    config_id SERIAL PRIMARY KEY,
    default_time_token INT DEFAULT 100,
    default_exchange_rate_id INT,
    FOREIGN KEY (default_exchange_rate_id) REFERENCES exchange_rates(rate_id)
);

-- Insert initial data into exchange_rates
INSERT INTO exchange_rates (description) VALUES 
('1 โทเคนเวลา ต่อ 1 ชั่วโมง'),
('1 โทเคนเวลา ต่อ 1 กิจกรรม');

-- Insert initial data into community_config
INSERT INTO community_config (default_time_token, default_exchange_rate_id) VALUES (100, 1);

-- Insert initial data into users
INSERT INTO users (username, password, email, role) 
VALUES ('testuser', '$2a$10$y2yR9UyFAUfyYCiYqDxgteWBflWnsbYdlFZDmNPmn7P1.xUfbRFtu', 'testuser@example.com', 'Member');

-- Insert initial data into members
INSERT INTO members (user_id, name, phone, address, branch, time_credits, status) 
VALUES (1, 'Test User', '1234567890', '123 Test St, Test City', 'Test Branch', 10, 'active');

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
INSERT INTO member_skills (member_id, skill_id) 
VALUES 
(1, 1),
(1, 2),
(1, 3),
(1, 4);

-- Insert initial data into activity_participants
INSERT INTO activity_participants (activity_id, member_id) 
VALUES 
(1, 1),
(2, 1),
(3, 1),
(4, 1);

-- Insert initial data into transactions
INSERT INTO transactions (member_id, activity_id, date, time, time_credits, transaction_type, details, requester_id, participant_id) 
VALUES 
(1, 1, '2023-01-01', '09:00:00', 1, 'earn', 'Participated in activity: กิจกรรมทำความสะอาดชุมชน', 1, 1),
(1, 2, '2023-01-15', '10:00:00', 1, 'earn', 'Participated in activity: กิจกรรมสอนคอมพิวเตอร์', 1, 1),
(1, 3, '2023-01-30', '11:00:00', 1, 'earn', 'Participated in activity: กิจกรรมทำอาหาร', 1, 1),
(1, 4, '2023-02-05', '08:00:00', 1, 'earn', 'Participated in activity: กิจกรรมทำสวน', 1, 1);

-- Insert initial data into community_fund
INSERT INTO community_fund (total_hours, borrowed_hours) VALUES (200, 50);