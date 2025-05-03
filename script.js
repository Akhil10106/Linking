// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJmnErOKgB5Pp45A00A1J_agJQFSPAyjY",
    authDomain: "edutech-a9b19.firebaseapp.com",
    databaseURL: "https://edutech-a9b19-default-rtdb.firebaseio.com",
    projectId: "edutech-a9b19",
    storageBucket: "edutech-a9b19.firebasestorage.app",
    messagingSenderId: "436628237784",
    appId: "1:436628237784:web:0683a574cdb0b9401616ad",
    measurementId: "G-FK8CSTSW64"
};

// Initialize Firebase with error handling
try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    console.error('Firebase initialization failed:', error);
    alert('Failed to initialize application. Please try again later.');
}

const auth = firebase.auth();
const db = firebase.database();

// Page Functions
function showPage(id) {
    document.querySelectorAll('.full-page').forEach(page => page.style.display = 'none');
    const page = document.getElementById(id);
    if (page) {
        page.style.display = 'flex';
    }
}

function hidePage(id) {
    const page = document.getElementById(id);
    if (page) {
        page.style.display = 'none';
    }
}

// Handle Cross Button
function handleCrossButton(context) {
    switch (context) {
        case 'login':
            hidePage('login-page');
            showPage('main-page');
            break;
        case 'register':
            hidePage('register-page');
            showPage('login-page');
            break;
        case 'subscription':
            hidePage('subscription-page');
            showPage('login-page');
            break;
        case 'payment':
            hidePage('payment-page');
            showPage('subscription-page');
            break;
        case 'trial':
            hidePage('trial-page');
            showPage('subscription-page');
            break;
        case 'main':
            document.getElementById('main-buttons').style.display = 'none';
            document.getElementById('login-button').style.display = 'flex';
            break;
        default:
            console.warn('Unknown cross button context:', context);
    }
}

// Toggle Pricing
function togglePricing() {
    const toggle = document.getElementById('pricing-toggle');
    const monthlyPrices = document.querySelectorAll('.price.monthly');
    const yearlyPrices = document.querySelectorAll('.price.yearly');

    if (toggle.checked) {
        monthlyPrices.forEach(price => price.style.display = 'none');
        yearlyPrices.forEach(price => price.style.display = 'block');
    } else {
        monthlyPrices.forEach(price => price.style.display = 'block');
        yearlyPrices.forEach(price => price.style.display = 'none');
    }
}

// Select Plan
function selectPlan(plan) {
    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to select a plan.');
        showPage('login-page');
        return;
    }

    const planDetails = {
        core: { 
            name: 'Core', 
            monthly: 1000, 
            yearly: 10000,
            features: ['Basic exam management', 'Up to 50 students', 'Email support']
        },
        pro: { 
            name: 'Pro', 
            monthly: 3000, 
            yearly: 30000,
            features: ['Advanced exam tools', 'Up to 200 students', 'Priority support']
        },
        elite: { 
            name: 'Elite', 
            monthly: 5000, 
            yearly: 50000,
            features: ['Full feature access', 'Unlimited students', '24/7 premium support']
        }
    };

    const selectedPlan = planDetails[plan];
    if (!selectedPlan) {
        alert('Invalid plan selected. Please try again.');
        return;
    }

    const isYearly = document.getElementById('pricing-toggle').checked;
    const amount = isYearly ? selectedPlan.yearly : selectedPlan.monthly;
    const period = isYearly ? 'yearly' : 'monthly';

    db.ref('pending_plans/' + user.uid).set({
        plan: selectedPlan.name,
        amount: amount,
        period: period,
        features: selectedPlan.features,
        timestamp: new Date().toISOString()
    }).then(() => {
        hidePage('subscription-page');
        document.getElementById('plan-name').textContent = selectedPlan.name;
        document.getElementById('plan-price').textContent = `₹${amount.toLocaleString('en-IN')} / ${period === 'monthly' ? 'month' : 'year'}`;
        document.getElementById('plan-period').textContent = `Billed ${period}`;
        const featuresList = document.getElementById('plan-features');
        featuresList.innerHTML = '';
        selectedPlan.features.forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            featuresList.appendChild(li);
        });
        document.getElementById('unique-id').value = '';
        showPage('payment-page');
    }).catch(error => {
        console.error('Error storing plan selection:', error);
        alert('Failed to select plan. Please check your connection and try again.');
    });
}

// Handle Login
async function handleLogin() {
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        const user = auth.currentUser;
        if (user) {
            checkUserStatus(user.uid);
        } else {
            alert('User authentication failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

// Handle Registration
async function handleRegister() {
    const name = document.getElementById('register-name')?.value?.trim();
    const email = document.getElementById('register-email')?.value?.trim();
    const password = document.getElementById('register-password')?.value;
    const orgId = document.getElementById('register-org-id')?.value?.trim();

    if (!name || !email || !password || !orgId) {
        alert('Please fill in all registration fields.');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await db.ref('users/' + user.uid).set({
            id: user.uid,
            name: name,
            email: email,
            organization_id: orgId,
            subscription_status: false,
            subscription_expiry: null,
            trial_used: false,
            trial_start: null
        });

        showPage('subscription-page');
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed: ' + error.message);
    }
}

// Check User Subscription/Trial Status
function checkUserStatus(uid) {
    db.ref('users/' + uid).once('value', (snapshot) => {
        const userData = snapshot.val();
        if (!userData) {
            alert('User data not found.');
            auth.signOut();
            return;
        }

        const now = new Date().getTime();

        if (userData.subscription_status && userData.subscription_expiry > now) {
            document.getElementById('login-button').style.display = 'none';
            document.getElementById('main-buttons').style.display = 'flex';
            showPage('main-page');
        } else if (!userData.trial_used) {
            showPage('subscription-page');
        } else if (userData.trial_used && userData.trial_start + 24 * 60 * 60 * 1000 > now) {
            document.getElementById('login-button').style.display = 'none';
            document.getElementById('main-buttons').style.display = 'flex';
            showPage('main-page');
        } else {
            showPage('subscription-page');
        }
    }, (error) => {
        console.error('Error fetching user data:', error);
        alert('Failed to fetch user data. Please check your connection and try again.');
    });
}

// Submit Unique ID for Payment Verification
function submitUniqueId() {
    const uniqueId = document.getElementById('unique-id')?.value?.trim();
    const user = auth.currentUser;

    if (!user) {
        alert('You must be logged in to submit a payment.');
        return;
    }

    if (!uniqueId) {
        alert('Please enter a valid Unique ID.');
        return;
    }

    db.ref('pending_payments/' + user.uid).set({
        unique_id: uniqueId,
        timestamp: new Date().toISOString()
    }).then(() => {
        alert('Payment verification submitted. Please wait for admin approval.');
    }).catch((error) => {
        console.error('Error submitting payment:', error);
        alert('Failed to submit payment verification. Please check your connection and try again.');
    });
}

// Confirm Trial
function confirmTrial() {
    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to start a trial.');
        hidePage('trial-page');
        showPage('login-page');
        return;
    }

    const trialStart = new Date().getTime();
    db.ref('users/' + user.uid).update({
        trial_used: true,
        trial_start: trialStart
    }).then(() => {
        document.getElementById('login-button').style.display = 'none';
        document.getElementById('main-buttons').style.display = 'flex';
        hidePage('trial-page');
        showPage('main-page');
    }).catch((error) => {
        console.error('Error starting trial:', error);
        alert('Failed to start trial. Please check your connection and try again.');
    });
}

// Firebase Auth State Listener
auth.onAuthStateChanged((user) => {
    if (user) {
        checkUserStatus(user.uid);
    } else {
        document.getElementById('login-button').style.display = 'flex';
        document.getElementById('main-buttons').style.display = 'none';
        showPage('login-page');
    }
});

// Button Animation
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.btn, button:not(.cross-btn)');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            button.style.transform = 'scale(0.98)';
            button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = '0 4px 12px rgba(46, 113, 204, 0.2)';
            }, 200);
        });
    });
});
