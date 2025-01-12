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
    requester_name VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('กำลังจะเริ่ม', 'เสร็จสิ้น', 'ยกเลิก', 'เกินเวลา')),
    time_tokens_required INT DEFAULT 0,
    time_tokens_per_participant INT DEFAULT 0
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
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    time_credits INT,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('earn', 'spend')),
    FOREIGN KEY (member_id) REFERENCES members(member_id)
);

-- Insert initial data into users
INSERT INTO users (username, password, email, role) 
VALUES ('testuser', '$2a$10$y2yR9UyFAUfyYCiYqDxgteWBflWnsbYdlFZDmNPmn7P1.xUfbRFtu', 'testuser@example.com', 'Member');

-- Insert initial data into members
INSERT INTO members (user_id, name, phone, address, branch, time_credits, status) 
VALUES (1, 'Test User', '1234567890', '123 Test St, Test City', 'Test Branch', 10, 'active');

-- Insert initial data into activities
INSERT INTO activities (title, description, location, start_date, start_time, end_date, end_time, max_participants, requester_name, status, time_tokens_required, time_tokens_per_participant) 
VALUES 
('กิจกรรมทำความสะอาดชุมชน', 'ทำความสะอาดชุมชน', 'Community Center', '2023-01-01', '09:00', '2023-01-01', '12:00', 20, 'Test User', 'กำลังจะเริ่ม', 20, 1),
('กิจกรรมสอนคอมพิวเตอร์', 'สอนคอมพิวเตอร์ให้กับชุมชน', 'Community Center', '2023-01-15', '10:00', '2023-01-15', '13:00', 15, 'Test User', 'กำลังจะเริ่ม', 15, 1),
('กิจกรรมทำอาหาร', 'ทำอาหารร่วมกัน', 'Community Kitchen', '2023-01-30', '11:00', '2023-01-30', '14:00', 10, 'Test User', 'เสร็จสิ้น', 10, 1),
('กิจกรรมทำสวน', 'ทำสวนร่วมกัน', 'Community Garden', '2023-02-05', '08:00', '2023-02-05', '11:00', 25, 'Test User', 'เสร็จสิ้น', 25, 1),
('กิจกรรมยกเลิก', 'กิจกรรมนี้ถูกยกเลิก', 'Community Center', '2023-02-20', '09:00', '2023-02-20', '12:00', 0, 'Test User', 'ยกเลิก', 0, 0),
('กิจกรรมยกเลิก', 'กิจกรรมนี้ถูกยกเลิก', 'Community Center', '2023-02-25', '09:00', '2023-02-25', '12:00', 0, 'Test User', 'ยกเลิก', 0, 0);

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
INSERT INTO transactions (member_id, date, details, time_credits, transaction_type) 
VALUES 
(1, '2023-01-01 09:00:00', 'Participated in community cleaning', 1, 'earn'),
(1, '2023-01-15 10:00:00', 'Taught computer skills', 1, 'earn'),
(1, '2023-01-30 11:00:00', 'Cooked food together', 1, 'earn'),
(1, '2023-02-05 08:00:00', 'Worked in the community garden', 1, 'earn');

-- Insert initial data into community_fund
INSERT INTO community_fund (total_hours, borrowed_hours) VALUES (200, 50);