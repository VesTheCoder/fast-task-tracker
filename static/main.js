document.addEventListener('DOMContentLoaded', () => {
    // Initialize the appropriate page functionality
    const currentPath = window.location.pathname;
    
    if (currentPath === '/' || currentPath === '/index.html') {
        initHomePage();
    } else if (currentPath === '/tasks' || currentPath === '/tasks.html') {
        initTasksPage();
    } else if (currentPath === '/auth' || currentPath === '/auth.html') {
        initAuthPage();
    }
});

// API URL Constants
const API_URL = '/api';
const TASKS_API = `${API_URL}/tasks`;
const AUTH_API = `${API_URL}/auth`;

// Home Page Initialization
function initHomePage() {
    console.log('Home page initialized');
    // Add any home page specific functionality here
}

// Tasks Page Initialization
function initTasksPage() {
    console.log('Tasks page initialized');
    
    // DOM Elements
    const taskForm = document.getElementById('task-form');
    const tasksList = document.getElementById('tasks-list');
    const taskTemplate = document.getElementById('task-template');
    const editTaskModal = document.getElementById('edit-task-modal');
    const editTaskForm = document.getElementById('edit-task-form');
    const closeModal = document.querySelector('.close-modal');
    const timerCompleteSound = document.getElementById('timer-complete-sound');
    const userStatusElement = document.getElementById('user-status');

    // Check authentication status
    checkAuthStatus()
        .then(data => {
            if (!data.is_guest) {
                userStatusElement.innerHTML = `Welcome back, <strong>${data.user_email}</strong>! Your tasks are saved to your account.`;
            }
        })
        .catch(error => console.error('Auth check error:', error));

    // Load tasks on page load
    loadTasks();

    // Event Listeners
    taskForm.addEventListener('submit', handleAddTask);
    editTaskForm.addEventListener('submit', handleEditTask);
    closeModal.addEventListener('click', () => editTaskModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === editTaskModal) {
            editTaskModal.style.display = 'none';
        }
    });

    // Functions
    async function loadTasks() {
        try {
            console.log('Fetching tasks from:', TASKS_API);
            const response = await fetch(TASKS_API + '/');
            
            if (!response.ok) {
                console.error('Failed to load tasks:', response.status, response.statusText);
                throw new Error(`Failed to load tasks: ${response.status} ${response.statusText}`);
            }
            
            const tasks = await response.json();
            console.log('Tasks loaded:', tasks);
            renderTasks(tasks);
        } catch (error) {
            console.error('Error loading tasks:', error);
            showEmptyTasksMessage();
        }
    }

    function renderTasks(tasks) {
        // Clear existing tasks
        while (tasksList.firstChild) {
            if (tasksList.firstChild.classList && tasksList.firstChild.classList.contains('empty-tasks-message')) {
                break;
            }
            tasksList.removeChild(tasksList.firstChild);
        }

        // Show empty message if no tasks
        if (tasks.length === 0) {
            showEmptyTasksMessage();
            return;
        }

        // Hide empty message if there are tasks
        const emptyMessage = tasksList.querySelector('.empty-tasks-message');
        if (emptyMessage) {
            emptyMessage.style.display = 'none';
        }

        // Render each task
        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            tasksList.appendChild(taskElement);
        });
    }

    function createTaskElement(task) {
        const taskClone = document.importNode(taskTemplate.content, true);
        const taskItem = taskClone.querySelector('.task-item');
        
        // Set task data
        taskItem.dataset.taskId = task.id;
        taskItem.querySelector('.task-title').textContent = task.title;
        taskItem.querySelector('.task-description').textContent = task.description || 'No description';
        
        // Set timer text
        const timerDisplay = taskItem.querySelector('.timer-value');
        if (task.timer_active) {
            timerDisplay.textContent = formatSeconds(task.timer_lenght);
            connectWebSocket(task.id, task.timer_lenght, timerDisplay);
        } else {
            timerDisplay.textContent = task.timer_lenght ? formatSeconds(task.timer_lenght) : 'No timer';
        }
        
        // Set completion status
        const completionCheckbox = taskItem.querySelector('.task-complete-checkbox');
        completionCheckbox.checked = task.is_completed;
        if (task.is_completed) {
            taskItem.classList.add('completed');
        }
        
        // Event listeners for task actions
        taskItem.querySelector('.btn-edit').addEventListener('click', () => openEditModal(task));
        taskItem.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id));
        taskItem.querySelector('.btn-start-timer').addEventListener('click', () => startTimer(task.id));
        taskItem.querySelector('.btn-stop-timer').addEventListener('click', () => stopTimer(task.id));
        completionCheckbox.addEventListener('change', () => toggleTaskCompletion(task.id, completionCheckbox.checked));
        
        return taskItem;
    }

    function showEmptyTasksMessage() {
        const emptyMessage = tasksList.querySelector('.empty-tasks-message');
        if (emptyMessage) {
            emptyMessage.style.display = 'block';
        } else {
            const message = document.createElement('div');
            message.className = 'empty-tasks-message';
            message.textContent = 'No tasks yet. Add your first task above!';
            tasksList.appendChild(message);
        }
    }

    async function handleAddTask(e) {
        e.preventDefault();
        
        const formData = new FormData(taskForm);
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            // Convert minutes to seconds for backend
            timer_lenght: (parseInt(formData.get('timer_lenght')) || 0) * 60
        };
        
        try {
            const response = await fetch(TASKS_API, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(taskData)
            });
            
            if (!response.ok) throw new Error('Failed to add task');
            
            const newTask = await response.json();
            const taskElement = createTaskElement(newTask);
            
            // Remove empty message if it exists
            const emptyMessage = tasksList.querySelector('.empty-tasks-message');
            if (emptyMessage) {
                emptyMessage.style.display = 'none';
            }
            
            tasksList.appendChild(taskElement);
            taskForm.reset();
        } catch (error) {
            console.error('Error adding task:', error);
            alert('Failed to add task. Please try again.');
        }
    }

    async function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        try {
            console.log(`Deleting task with ID: ${taskId}`);
            // Fix the URL format for the delete request
            const response = await fetch(`${TASKS_API}/?task_id=${taskId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                console.error('Failed to delete task:', response.status, response.statusText);
                throw new Error(`Failed to delete task: ${response.status} ${response.statusText}`);
            }
            
            console.log(`Task ${taskId} deleted successfully`);
            // Remove the task element from the DOM
            const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.remove();
            }
            
            // If no more tasks, show empty message
            if (tasksList.children.length === 0 || (tasksList.children.length === 1 && tasksList.children[0].classList.contains('empty-tasks-message'))) {
                showEmptyTasksMessage();
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task. Please try again.');
        }
    }

    function openEditModal(task) {
        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-task-title').value = task.title;
        document.getElementById('edit-task-description').value = task.description || '';
        // Convert seconds to minutes for user input
        document.getElementById('edit-task-timer').value = task.timer_lenght ? Math.ceil(task.timer_lenght / 60) : 0;
        
        editTaskModal.style.display = 'block';
    }

    async function handleEditTask(e) {
        e.preventDefault();
        
        const formData = new FormData(editTaskForm);
        const taskId = document.getElementById('edit-task-id').value;
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            // Convert minutes to seconds for backend
            timer_lenght: (parseInt(formData.get('timer_lenght')) || 0) * 60
        };
        
        try {
            console.log(`Updating task ${taskId} with data:`, taskData);
            // Fix URL with trailing slash
            const response = await fetch(`${TASKS_API}/${taskId}/`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(taskData)
            });
            
            if (!response.ok) throw new Error('Failed to update task');
            
            const updatedTask = await response.json();
            
            // Update the task in the DOM
            const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.querySelector('.task-title').textContent = updatedTask.title;
                taskElement.querySelector('.task-description').textContent = updatedTask.description || 'No description';
                taskElement.querySelector('.timer-value').textContent = 
                    updatedTask.timer_active ? 'Running...' : (updatedTask.timer_lenght ? formatSeconds(updatedTask.timer_lenght) : 'No timer');
            }
            
            // Close the modal
            editTaskModal.style.display = 'none';
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Failed to update task. Please try again.');
        }
    }

    async function startTimer(taskId) {
        try {
            // Fix URL with trailing slash
            const response = await fetch(`${TASKS_API}/${taskId}/timer_start/`, {
                method: 'PUT'
            });
            
            if (!response.ok) {
                console.error('Failed to start timer:', response.status, response.statusText);
                throw new Error(`Failed to start timer: ${response.status} ${response.statusText}`);
            }
            
            const task = await response.json();
            console.log('Timer started, response:', task);
            
            // Update the task in the DOM
            const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (taskElement) {
                const timerDisplay = taskElement.querySelector('.timer-value');
                
                // Make sure we have a valid timer length before displaying and connecting
                if (task && task.timer_lenght && !isNaN(task.timer_lenght)) {
                    timerDisplay.textContent = formatSeconds(task.timer_lenght);
                    console.log('Starting timer WebSocket with duration:', task.timer_lenght);
                    // Connect to WebSocket for real-time updates
                    connectWebSocket(taskId, task.timer_lenght, timerDisplay);
                } else {
                    console.error('Invalid timer length from server:', task);
                    timerDisplay.textContent = 'Timer error';
                }
            }
        } catch (error) {
            console.error('Error starting timer:', error);
            alert('Failed to start timer. Please try again.');
        }
    }

    async function stopTimer(taskId) {
        try {
            // Fix URL with trailing slash
            const response = await fetch(`${TASKS_API}/${taskId}/timer_stop/`, {
                method: 'PUT'
            });
            
            if (!response.ok) {
                console.error('Failed to stop timer:', response.status, response.statusText);
                throw new Error(`Failed to stop timer: ${response.status} ${response.statusText}`);
            }
            
            const task = await response.json();
            console.log('Timer stopped, response:', task);
            
            // Update the task in the DOM
            const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (taskElement) {
                const timerDisplay = taskElement.querySelector('.timer-value');
                timerDisplay.textContent = formatSeconds(task.timer_lenght);
            }
        } catch (error) {
            console.error('Error stopping timer:', error);
            alert('Failed to stop timer. Please try again.');
        }
    }

    async function toggleTaskCompletion(taskId, isCompleted) {
        try {
            console.log(`Toggling task ${taskId} completion to: ${isCompleted}`);
            // Fix URL with trailing slash
            const response = await fetch(`${TASKS_API}/${taskId}/`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ is_completed: isCompleted })
            });
            
            if (!response.ok) {
                console.error('Failed to update task completion:', response.status, response.statusText);
                throw new Error(`Failed to update task completion: ${response.status} ${response.statusText}`);
            }
            
            console.log(`Successfully updated task ${taskId} completion status`);
            // Update task styling based on completion status
            const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (taskElement) {
                if (isCompleted) {
                    taskElement.classList.add('completed');
                } else {
                    taskElement.classList.remove('completed');
                }
            }
        } catch (error) {
            console.error('Error updating task completion:', error);
            alert('Failed to update task completion status. Please try again.');
        }
    }

    function connectWebSocket(taskId, duration, timerDisplay) {
        // Ensure we have a valid duration
        if (!duration || isNaN(duration)) {
            console.error('Invalid timer duration:', duration);
            timerDisplay.textContent = 'Invalid timer';
            return;
        }
        
        console.log(`Creating WebSocket connection for timer with duration: ${duration} seconds`);
        // Create WebSocket connection for this timer - ensure it's an integer
        const ws = new WebSocket(`ws://${window.location.host}/ws/timer/${Math.floor(duration)}`);
        
        // Show connecting status
        timerDisplay.textContent = 'Connecting...';
        
        ws.onopen = () => {
            console.log('WebSocket connection established for timer');
            timerDisplay.textContent = formatSeconds(duration); // Show initial time
        };
        
        ws.onmessage = (event) => {
            const data = event.data;
            console.log('Timer WebSocket received data:', data);
            
            if (data === 'TIMER_FINISHED') {
                // Timer completed
                console.log('Timer completed!');
                timerDisplay.textContent = 'Completed!';
                timerDisplay.classList.add('timer-completed');
                
                // Play sound notification
                try {
                    timerCompleteSound.play().catch(e => console.error('Error playing sound:', e));
                } catch (e) {
                    console.error('Error playing sound:', e);
                }
                
                // Show browser notification if permitted
                if (Notification.permission === 'granted') {
                    new Notification('Task Timer Completed!', {
                        body: 'Your task timer has finished.',
                        icon: '/static/favicon.ico'
                    });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            } else {
                try {
                    // Update timer display - handle possible parsing errors
                    const seconds = parseInt(data);
                    if (!isNaN(seconds)) {
                        timerDisplay.textContent = formatSeconds(seconds);
                    } else {
                        console.error('Invalid timer data received:', data);
                    }
                } catch (e) {
                    console.error('Error processing timer data:', e);
                }
            }
        };
        
        ws.onclose = (event) => {
            console.log('Timer WebSocket connection closed', event.code, event.reason);
            if (event.code !== 1000) { // 1000 is normal closure
                timerDisplay.textContent = 'Timer disconnected';
            }
        };
        
        ws.onerror = (error) => {
            console.error('Timer WebSocket error:', error);
            timerDisplay.textContent = 'Error connecting to timer';
        };
        
        // Set a timeout to detect connection issues
        const connectionTimeout = setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                console.error('WebSocket connection timeout');
                timerDisplay.textContent = 'Connection timeout';
                try {
                    ws.close();
                } catch (e) {
                    console.error('Error closing WebSocket:', e);
                }
            }
        }, 5000); // 5 second timeout
        
        // Clear timeout once connection is established
        ws.addEventListener('open', () => {
            clearTimeout(connectionTimeout);
        });
    }

    function formatSeconds(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Auth Page Initialization
function initAuthPage() {
    console.log('Auth page initialized');
    
    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    const userArea = document.getElementById('user-area');
    const userEmail = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const authStatusMessage = document.getElementById('auth-status-message');
    const authForms = document.getElementById('auth-forms');

    // Check if user is already logged in
    checkAuthStatus()
        .then(data => {
            if (!data.is_guest) {
                // User is logged in
                showUserArea(data.user_email);
            }
        })
        .catch(error => console.error('Auth check error:', error));

    // Event Listeners
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (switchToRegister) switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        registerContainer.classList.remove('hidden');
    });
    if (switchToLogin) switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);

    // Functions
    async function handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const loginData = {
            email: formData.get('email'),
            pasword: formData.get('pasword')
        };
        
        try {
            const response = await fetch(`${AUTH_API}/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(loginData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }
            
            const data = await response.json();
            showUserArea(loginData.email);
            showStatusMessage('Login successful! Welcome back.', 'success');
        } catch (error) {
            console.error('Login error:', error);
            showStatusMessage(error.message || 'Login failed. Please check your credentials.', 'error');
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(registerForm);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');
        
        if (password !== confirmPassword) {
            showStatusMessage('Passwords do not match', 'error');
            return;
        }
        
        const registerData = {
            email: formData.get('email'),
            password: password
        };
        
        try {
            const response = await fetch(`${AUTH_API}/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(registerData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }
            
            const data = await response.json();
            registerForm.reset();
            
            // Show success message and switch to login
            showStatusMessage('Registration successful! You can now login.', 'success');
            registerContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        } catch (error) {
            console.error('Registration error:', error);
            showStatusMessage(error.message || 'Registration failed. Please try again.', 'error');
        }
    }

    async function handleLogout() {
        try {
            const response = await fetch(`${AUTH_API}/my-account`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Logout failed');
            
            userArea.classList.add('hidden');
            authForms.classList.remove('hidden');
            loginContainer.classList.remove('hidden');
            showStatusMessage('You have been logged out successfully.', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showStatusMessage('Logout failed. Please try again.', 'error');
        }
    }

    function showUserArea(email) {
        if (userEmail) userEmail.textContent = email;
        if (authForms) authForms.classList.add('hidden');
        if (userArea) userArea.classList.remove('hidden');
    }

    function showStatusMessage(message, type) {
        if (!authStatusMessage) return;
        
        authStatusMessage.textContent = message;
        authStatusMessage.className = 'auth-status-message';
        authStatusMessage.classList.add(type);
        
        // Hide the message after 5 seconds
        setTimeout(() => {
            authStatusMessage.classList.remove(type);
            authStatusMessage.style.display = 'none';
        }, 5000);
    }
}

// Helper function to check authentication status
async function checkAuthStatus() {
    try {
        // This is a mock implementation since we don't have a real endpoint for this
        // In a real app, we would have an endpoint to check user status
        const token = getAuthToken();
        
        if (token) {
            try {
                // Try to parse the JWT to get user info
                const payload = parseJwt(token);
                if (payload && payload.sub) {
                    return { is_guest: false, user_email: payload.sub };
                }
            } catch (e) {
                console.error('Error parsing token:', e);
            }
        }
        
        return { is_guest: true };
    } catch (error) {
        console.error('Error checking auth status:', error);
        return { is_guest: true };
    }
}

// Helper function to get auth token from cookies
function getAuthToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'session_token') { // This should match the cookie name in settings.py
            return value;
        }
    }
    return null;
}

// Helper function to parse JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error parsing JWT:', e);
        return null;
    }
}