# DISCLAMER
The app is fully functional.
App is published here: http://vesprin.pythonanywhere.com/
It's free hosting, so it's kinda slow and there is no HTTPS. If you are not comfortable with HTTP, you can easily install the project locally to check out everything on the fast pace. All info and instructions are below.

# Fast Task Tracker

**Fast Task Tracker** is a modern, web-based task management application built with Python and FastAPI. It offers a seamless experience for both registered users and guests, featuring real-time task timers, authentication, and a clean frontend.

---

## 🚀 Features

- **Task Management**: Create, update, and delete tasks.
- **Task Timers**: Start and stop timers for each task, with real-time countdown updates via WebSockets.
- **Guest & Authenticated Modes**: Use the app with or without registration. Guest sessions are managed securely with cookies.
- **JWT Authentication**: Secure login and registration with hashed passwords and JWT-based session management.
- **Responsive UI**: Clean, user-friendly interface built with Jinja2 templates, custom CSS, and JavaScript.
- **Real-Time Updates**: WebSocket-powered timer notifications and updates.
- **Persistent Storage**: All data is stored in a database via SQLAlchemy ORM.
- **Background Scheduling**: Task timers are managed reliably using APScheduler, ensuring timers complete even if the user disconnects.
- **API-First Design**: RESTful API endpoints for all core features, easily re-usable for and by external clients.

---

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, APScheduler
- **Frontend**: Jinja2, HTML5, CSS3, JavaScript
- **Authentication**: JWT (PyJWT), Passlib (bcrypt)
- **Database**: SQLite (default, easily swappable to PostgreSQL by adding new credentials in you server enviroment)
- **WebSockets**: Real-time timer updates
- **Other**: Uvicorn (ASGI server), python-dotenv (config), Pydantic (validation)

---

## 🏗️ Architecture & Know-Hows

### 1. Dual-Mode User System
- **Registered Users**: Full-featured accounts with secure password hashing and JWT authentication.
- **Guest Users**: Seamless, cookie-based guest sessions allow instant use without sign-up, with tasks stored and managed per session.

### 2. Real-Time Task Timers
- **WebSocket Integration**: Each task can have a timer, with second-by-second updates pushed to the client in real time.
- **Background Scheduler**: APScheduler ensures that timers are reliable even if the user disconnects or reloads.

### 3. Clean API & Frontend Separation
- **RESTful API**: All business logic is exposed via API endpoints, making the backend reusable for other clients.
- **Jinja2 Templates**: The frontend is rendered server-side for fast initial loads, with dynamic updates via JavaScript and WebSockets.

### 4. Security Best Practices
- **Password Hashing**: All passwords are hashed using bcrypt.
- **JWT Tokens**: Secure, stateless authentication for API access.
- **Cookie Management**: HttpOnly, Secure, and SameSite cookie flags for session and guest management.

### 5. Extensible & Configurable
- **Environment-Based Settings**: Easily switch databases, secret keys, and debug modes via environment variables.
- **Modular Routers**: Auth and task management are separated for the ease of maintanance.

---

## 📦 Installation with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fast-task-tracker.git
   ```

2. **Start the docker-compose.yml file**

---

## 📦 Installation manual

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fast-task-tracker.git
   ```

2. **Create a virtual environment and activate it**
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On Unix/Mac:
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   Running the main.py file would start the uvicorn server
   ```bash
   python main.py
   ```

5. **Open your browser**
   - Visit [http://localhost:6969](http://localhost:6969)

---

## 📝 Usage

- **Home Page**: View and manage your tasks.
- **Timers**: Start a timer for any task; get real-time updates and notifications when time is up.
- **Authentication**: Register or log in for persistent task management, or use as a guest for quick, session-based tracking.

---

## 🧠 Notable Implementation Details

- **WebSocket Timer**: Each timer runs in real time, sending updates every second to the client. When the timer ends, a notification is pushed instantly.
- **Background Jobs**: Even if a user disconnects, the timer's state is managed server-side and updates the database accordingly.
- **Guest Sessions**: Guests are tracked with secure, expiring cookies, allowing them to use the app without registration but still have persistent tasks for the session.
- **Security**: All sensitive operations use best practices for password storage, token management, and cookie handling.

---

Thank you for your attention on this matter.