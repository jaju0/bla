CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(255) NOT NULL PRIMARY KEY,
    password_hash CHAR(60) NOT NULL,
    user_description TEXT
)