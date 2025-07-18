<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AgencyIQ Social Media Automation Mockup</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .hidden { display: none; }
        button { padding: 10px; margin: 5px; }
        #dashboard { border: 1px solid #ccc; padding: 20px; }
    </style>
</head>
<body>
    <h1>AgencyIQ - Social Media Automation Mockup</h1>

    <!-- Onboarding Section -->
    <div id="onboarding" class="section">
        <h2>Onboarding: Sign Up</h2>
        <form id="signupForm">
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Password" required>
            <button type="submit">Sign Up & Verify</button>
        </form>
        <p id="onboardingStatus"></p>
    </div>

    <!-- Login/OAuth Section -->
    <div id="login" class="section hidden">
        <h2>Login with OAuth (Mock)</h2>
        <button onclick="mockOAuthLogin('twitter')">Login with Twitter</button>
        <button onclick="mockOAuthLogin('instagram')">Login with Instagram</button>
        <p id="loginStatus"></p>
    </div>

    <!-- Dashboard Section -->
    <div id="dashboard" class="section hidden">
        <h2>Dashboard</h2>
        <p>Welcome, <span id="userEmail"></span>! Session active.</p>

        <!-- Quota Management -->
        <div>
            <h3>Quota Tracker (Mock)</h3>
            <p>Twitter Posts Left: <span id="twitterQuota">10/10</span></p>
            <p>Instagram Posts Left: <span id="instagramQuota">5/5</span></p>
        </div>

        <!-- Auto-Posting -->
        <div>
            <h3>Schedule Auto-Post</h3>
            <input type="text" id="postContent" placeholder="Post content">
            <select id="platform">
                <option value="twitter">Twitter</option>
                <option value="instagram">Instagram</option>
            </select>
            <input type="datetime-local" id="scheduleTime">
            <button onclick="schedulePost()">Schedule</button>
            <p id="postStatus"></p>
            <ul id="postQueue"></ul>
        </div>

        <button onclick="logout()">Logout</button>
    </div>

    <script>
        // Mock Sessions with localStorage (simulates cookies/sessions)
        function setSession(user) {
            localStorage.setItem('session', JSON.stringify(user));
            showDashboard(user);
        }

        function getSession() {
            return JSON.parse(localStorage.getItem('session'));
        }

        function clearSession() {
            localStorage.removeItem('session');
            document.getElementById('onboarding').classList.remove('hidden');
            document.getElementById('login').classList.add('hidden');
            document.getElementById('dashboard').classList.add('hidden');
        }

        // Mock Onboarding
        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            if (email && password) {
                // Simulate verf (in real, send email)
                document.getElementById('onboardingStatus').textContent = 'Verification "sent" - Mock logged in!';
                setSession({ email, platforms: [] });
                document.getElementById('onboarding').classList.add('hidden');
                document.getElementById('login').classList.remove('hidden');
            } else {
                document.getElementById('onboardingStatus').textContent = 'Invalid input - try again.';
            }
        });

        // Mock OAuth Login
        function mockOAuthLogin(platform) {
            const session = getSession();
            if (session) {
                session.platforms.push(platform);
                setSession(session);
                document.getElementById('loginStatus').textContent = `Mock connected to ${platform}!`;
            }
        }

        // Show Dashboard
        function showDashboard(user) {
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('onboarding').classList.add('hidden');
            document.getElementById('login').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            // Mock Quotas
            updateQuotas();
        }

        // Mock Quota Management
        let quotas = { twitter: 10, instagram: 5 };
        function updateQuotas() {
            document.getElementById('twitterQuota').textContent = `${quotas.twitter}/10`;
            document.getElementById('instagramQuota').textContent = `${quotas.instagram}/5`;
        }

        // Mock Auto-Posting
        let postQueue = [];
        function schedulePost() {
            const content = document.getElementById('postContent').value;
            const platform = document.getElementById('platform').value;
            const time = new Date(document.getElementById('scheduleTime').value);
            if (content && time > new Date() && quotas[platform] > 0) {
                postQueue.push({ content, platform, time });
                quotas[platform]--;
                updateQuotas();
                document.getElementById('postStatus').textContent = 'Post scheduled!';
                renderQueue();
                // Simulate timer fire
                setTimeout(() => {
                    console.log(`Posting to ${platform}: ${content}`);
                    postQueue = postQueue.filter(p => p !== { content, platform, time });
                    renderQueue();
                }, time - new Date());
            } else {
                document.getElementById('postStatus').textContent = 'Invalid or quota exceeded.';
            }
        }

        function renderQueue() {
            const ul = document.getElementById('postQueue');
            ul.innerHTML = '';
            postQueue.forEach(p => {
                const li = document.createElement('li');
                li.textContent = `${p.platform}: ${p.content} at ${p.time}`;
                ul.appendChild(li);
            });
        }

        // Logout
        function logout() {
            clearSession();
        }

        // Init Check
        const session = getSession();
        if (session) {
            showDashboard(session);
        }
    </script>
</body>
</html>