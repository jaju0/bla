CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    chatroom_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)