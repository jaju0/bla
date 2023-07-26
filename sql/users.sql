CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(255) NOT NULL PRIMARY KEY,
    api_key VARCHAR(32) NOT NULL,
    user_description TEXT
)