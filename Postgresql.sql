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
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    max_participants INT,
    requester_name VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('upcoming', 'completed', 'cancelled'))
);

-- Create the skills table
CREATE TABLE skills (
    skill_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL
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

-- Insert initial data into community_fund
INSERT INTO community_fund (total_hours, borrowed_hours) VALUES (200, 50);

-- Insert initial data into users
INSERT INTO users (user_id, username, password, email, role) 
VALUES (1, 'testuser', '$2a$10$y2yR9UyFAUfyYCiYqDxgteWBflWnsbYdlFZDmNPmn7P1.xUfbRFtu', 'testuser@example.com', 'Member');