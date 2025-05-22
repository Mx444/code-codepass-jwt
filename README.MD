# CodePass JWT

This repository contains a web-based password manager application built with a Node.js backend and a simple HTML/CSS/JavaScript frontend. It utilizes JWT (JSON Web Tokens) for authentication and manages user accounts and stored passwords.

## Repository Structure

The repository is organized as follows:

- **src/**: Source code directory
  - **backend/**: Node.js backend code
    - **config/**: Configuration files (bcrypt, token, cookie)
    - **controllers/**: Request handlers (authController)
    - **db/**: Database connection and transaction management (SQLite)
    - **middleware/**: Express middleware (auth, token)
    - **models/**: Database models (users, vault)
    - **routes/**: API routes (authRoutes)
    - **token/**: JWT token generation and verification
    - **utils/**: Utility functions (error handling, logging)
    - `app.js`: Main application entry point
    - `server.js`: Server setup
  - **frontend/**: Frontend web files
    - **css/**: Styling files (auth, vault)
    - **js/**: JavaScript files (login, signup)
    - `login.html`: Login page
    - `signup.html`: Signup page
    - `vault.html`: Password vault page
- `.gitignore`: Specifies intentionally untracked files that Git should ignore.
- `package.json`: Project dependencies and scripts.
- `package-lock.json`: Records the exact versions of dependencies.
- `combined.log`: Application log file.

## Features

CodePass JWT offers the following features:

- **User Authentication**:
  - Secure user signup with password hashing.
  - User login with username/password.
  - Two-factor authentication flow using a master password after initial login.
  - JWT-based access and refresh tokens for session management.
- **Password Vault**:
  - Securely store website credentials (site, username, password).
  - (Note: Vault functionality is outlined in `vaultModel.js` and `vault.html`, but implementation details for storing/retrieving items are not fully visible in the provided context).
- **User Management**:
  - Update username, password, or master password.
  - Remove user account.
- **Security**:
  - Password hashing using bcrypt.
  - JWT for stateless authentication.
  - Refresh tokens for obtaining new access tokens.

## Technical Implementation

The application is built using:

- **Backend**:
  - Node.js
  - Express.js
  - SQLite (via `sqlite3` or similar, based on `database.js`)
  - bcrypt for password hashing
  - jsonwebtoken for JWT
  - validator for input validation
- **Frontend**:
  - HTML
  - CSS
  - JavaScript
  - Font Awesome (via CDN) for icons

## Requirements

- Node.js (LTS version recommended)
- npm (Node Package Manager)

## Getting Started

To get the project up and running:

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    ```
    Replace `<repository_url>` with the actual URL of your repository.
2.  **Navigate to the project directory**:
    ```bash
    cd code-codepass-jwt
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Set up environment variables**:
    Create a `.env` file in the `src/backend` directory with the following variables:
    ```env
    SECRET_KEY=your_jwt_secret_key
    BCRYPT_SALT1=your_bcrypt_salt_rounds_for_passwords # e.g., 10
    BCRYPT_SALT2=your_bcrypt_salt_rounds_for_master_passwords # e.g., 12
    ```
    Replace the placeholder values with your actual secret key and salt rounds.
5.  **Run the backend server**:
    ```bash
    npm start
    ```
    The server should start, typically listening on a port defined in the backend code (e.g., 3000).
6.  **Access the frontend**:
    Open `src/frontend/signup.html` or `src/frontend/login.html` in your web browser. The frontend JavaScript will interact with the running backend.

## Notes

*This repository was created as part of the educational journey at Progetto Code.*