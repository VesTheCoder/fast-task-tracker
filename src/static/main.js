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

// Track active WebSocket connections per task
const activeTimerSockets = {};

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

    // Check authentication status and update UI
    checkAuthStatus()
        .then(data => {
            if (!data.is_guest) {
                userStatusElement.innerHTML = `Welcome back! Your tasks are saved to your account.`;
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
        // Get containers
        const activeList = document.getElementById('tasks-list');
        const completedList = document.getElementById('completed-tasks-list');

        // Clear existing tasks
        activeList.innerHTML = '';
        completedList.innerHTML = '';

        // Separate tasks
        const activeTasks = tasks.filter(task => !task.is_completed);
        const completedTasks = tasks.filter(task => task.is_completed);

        // Show empty message if no active tasks
        if (activeTasks.length === 0) {
            showEmptyTasksMessage();
        }

        // Show empty message if no completed tasks
        if (completedTasks.length === 0) {
            const message = document.createElement('div');
            message.className = 'empty-tasks-message';
            message.textContent = 'No completed tasks yet!';
            completedList.appendChild(message);
        }

        // Render each active task
        activeTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            activeList.appendChild(taskElement);
        });
        // Render each completed task
        completedTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            completedList.appendChild(taskElement);
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
        if (task.timer_active && task.timer_stop) {
            // Calculate remaining time from backend timer_stop
            const stopTime = new Date(task.timer_stop).getTime();
            const now = Date.now();
            let remaining = Math.ceil((stopTime - now) / 1000);
            if (remaining <= 0) {
                timerDisplay.textContent = 'Timer Completed!';
                timerDisplay.classList.add('timer-completed');
            } else {
                connectWebSocket(task.id, remaining, timerDisplay);
            }
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
                // Always connect WebSocket for real-time updates
                connectWebSocket(taskId, task.timer_lenght, timerDisplay);
            }
        } catch (error) {
            console.error('Error starting timer:', error);
            alert('Failed to start timer. Please try again.');
        }
    }

    async function stopTimer(taskId) {
        try {
            const response = await fetch(`${TASKS_API}/${taskId}/timer_stop/`, {
                method: 'PUT'
            });
            
            if (!response.ok) {
                console.error('Failed to stop timer:', response.status, response.statusText);
                throw new Error(`Failed to stop timer: ${response.status} ${response.statusText}`);
            }
            
            // Close the WebSocket for this timer if it exists
            if (activeTimerSockets[taskId]) {
                activeTimerSockets[taskId].close();
                delete activeTimerSockets[taskId];
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
            
            // Re-fetch and re-render all tasks to update containers
            loadTasks();
        } catch (error) {
            console.error('Error updating task completion:', error);
            alert('Failed to update task completion status. Please try again.');
        }
    }

    function connectWebSocket(taskId, duration, timerDisplay) {
        // Prevent multiple WebSockets for the same task
        if (activeTimerSockets[taskId]) {
            activeTimerSockets[taskId].close();
            delete activeTimerSockets[taskId];
        }
        // Ensure we have a valid duration
        if (!duration || isNaN(duration)) {
            console.error('Invalid timer duration:', duration);
            timerDisplay.textContent = 'Invalid timer';
            return;
        }
        
        console.log(`Creating WebSocket connection for timer with duration: ${duration} seconds`);
        // Use wss:// for HTTPS, ws:// for HTTP
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${wsProtocol}://${window.location.host}/ws/timer/${Math.floor(duration)}`);
        activeTimerSockets[taskId] = ws;
        
        // Show connecting status
        timerDisplay.textContent = 'Connecting...';
        
        ws.onopen = () => {
            console.log('WebSocket connection established for timer');
            // Do not set timerDisplay here; wait for backend message
        };
        
        ws.onmessage = (event) => {
            const data = event.data;
            console.log('Timer WebSocket received data:', data);
            
            if (data === 'TIMER_FINISHED') {
                // Timer completed
                console.log('Timer completed!');
                timerDisplay.textContent = 'Completed!';
                timerDisplay.classList.add('timer-completed');
                if (activeTimerSockets[taskId]) {
                    activeTimerSockets[taskId].close();
                    delete activeTimerSockets[taskId];
                }
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
            if (activeTimerSockets[taskId]) {
                delete activeTimerSockets[taskId];
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

    // Check if user is already logged in and update UI
    checkAuthStatus()
        .then(data => {
            if (!data.is_guest) {
                // User is logged in
                showUserArea(data.user_email);
            } else {
                // User is not logged in
                if (authForms) authForms.classList.remove('hidden');
                if (userArea) userArea.classList.add('hidden');
            }
        })
        .catch(error => {
            console.error('Auth check error:', error);
            if (authForms) authForms.classList.remove('hidden');
            if (userArea) userArea.classList.add('hidden');
        });

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
                body: JSON.stringify(loginData),
                credentials: 'include'
            });
            
            if (!response.ok) {
                let errorMsg = 'Login failed. Please check your credentials.';
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.detail) errorMsg = errorData.detail;
                } catch (e) {}
                showStatusMessage(errorMsg, 'error');
                return;
            }
            
            // After login, check status to get user email
            const statusData = await checkAuthStatus();
            if (!statusData.is_guest) {
                showUserArea(statusData.user_email);
                showStatusMessage('Login successful! Welcome back.', 'success');
            } else {
                showStatusMessage('Login failed. Please try again.', 'error');
            }
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
                let errorMsg = 'Registration failed, your email was wrong format, or pasword was weak. Please correct the mistakes.';
                showStatusMessage(errorMsg, 'error');
                return;
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
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Logout failed');
            
            userArea.classList.add('hidden');
            authForms.classList.remove('hidden');
            loginContainer.classList.remove('hidden');
            showStatusMessage('You have been logged out successfully.', 'success');
            // After logout, reload the page to update UI and clear tasks
            // window.location.reload();
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
        authStatusMessage.style.display = '';
        
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
        const response = await fetch(`${AUTH_API}/status`, {
            credentials: 'include'
        });
        if (!response.ok) {
            return { is_guest: true };
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking auth status:', error);
        return { is_guest: true };
    }
}