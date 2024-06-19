CREATE TABLE Sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX user_id_index (user_id),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

DELIMITER $$
CREATE EVENT clean_expired_sessions_event
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM Sessions WHERE expires_at < NOW();
$$
DELIMITER ;
