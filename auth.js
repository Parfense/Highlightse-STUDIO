// АВТОНОМНАЯ БАЗА ДАННЫХ ДЛЯ GITHUB PAGES (LOCALSTORAGE) + 3D WEBGL THREE.JS
const DB_KEY = 'highlightse_word_github_db_v1';
const SESSION_KEY = 'highlightse_word_active_user';

function getDatabase() {
    let raw = localStorage.getItem(DB_KEY);
    if (!raw) {
        const teachers = [];
        for (let i = 1; i <= 10; i++) {
            teachers.push({
                username: `teacher${i}`,
                first_name: 'Преподаватель',
                last_name: `#${i}`,
                dob: '',
                role: 'teacher'
            });
        }
        const initial = { users: teachers, documents: [] };
        localStorage.setItem(DB_KEY, JSON.stringify(initial));
        return initial;
    }
    return JSON.parse(raw);
}

function saveDatabase(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getActiveUser() {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
}

function setActiveUser(user) {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
}

// 3D WebGL сцена Three.js
let scene, camera, renderer, crystals = [], mouseX = 0, mouseY = 0;

function initThreeJS() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 26;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const l1 = new THREE.PointLight(0x10b981, 2.2, 100);
    l1.position.set(15, 15, 15);
    scene.add(l1);

    const l2 = new THREE.PointLight(0x34d399, 1.8, 100);
    l2.position.set(-15, -10, 10);
    scene.add(l2);

    const geos = [
        new THREE.IcosahedronGeometry(3.2, 0),
        new THREE.OctahedronGeometry(2.6, 0),
        new THREE.TorusKnotGeometry(2.0, 0.55, 80, 16),
        new THREE.DodecahedronGeometry(2.8, 0)
    ];

    const coords = [[-16, 7, -5], [17, -6, -8], [-14, -9, -4], [15, 9, -6], [0, 11, -12]];

    coords.forEach((p, idx) => {
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0x10b981,
            metalness: 0.15,
            roughness: 0.2,
            transparent: true,
            opacity: 0.35,
            wireframe: idx % 2 === 1
        });
        const mesh = new THREE.Mesh(geos[idx % geos.length], mat);
        mesh.position.set(p[0], p[1], p[2]);
        scene.add(mesh);
        crystals.push({ mesh, sx: 0.003 + idx * 0.001, sy: 0.004 + idx * 0.001 });
    });

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 4;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 4;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function animate() {
        requestAnimationFrame(animate);
        crystals.forEach((c, i) => {
            c.mesh.rotation.x += c.sx;
            c.mesh.rotation.y += c.sy;
            c.mesh.position.y += Math.sin(Date.now() * 0.001 + i) * 0.008;
        });
        camera.position.x += (mouseX - camera.position.x) * 0.04;
        camera.position.y += (-mouseY - camera.position.y) * 0.04;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    }
    animate();
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('highlightse_word_theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('highlightse_word_theme', 'dark');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('highlightse_word_theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    initThreeJS();
});

function setAuthTab(tab) {
    document.getElementById('tab-student-login').classList.toggle('active', tab === 'student-login');
    document.getElementById('tab-student-reg').classList.toggle('active', tab === 'student-reg');
    document.getElementById('tab-teacher-login').classList.toggle('active', tab === 'teacher-login');

    document.getElementById('form-student-login').style.display = tab === 'student-login' ? 'flex' : 'none';
    document.getElementById('form-student-reg').style.display = tab === 'student-reg' ? 'flex' : 'none';
    document.getElementById('form-teacher-login').style.display = tab === 'teacher-login' ? 'flex' : 'none';

    const err = document.getElementById('auth-error');
    if (err) err.style.display = 'none';
}

function showError(msg) {
    const err = document.getElementById('auth-error');
    err.textContent = msg;
    err.style.display = 'block';
}

function handleStudentLogin(e) {
    e.preventDefault();
    const username = document.getElementById('student-login-input').value.trim();
    const db = getDatabase();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.role === 'student');
    if (!user) {
        showError('Ученик с таким логином не найден. Сначала зарегистрируйтесь во вкладке «Регистрация ученика»!');
        return;
    }
    setActiveUser(user);
    window.location.href = 'editor.html';
}

function handleTeacherLogin(e) {
    e.preventDefault();
    const username = document.getElementById('teacher-login-input').value.trim();
    const db = getDatabase();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.role === 'teacher');
    if (!user) {
        showError('Неверный логин преподавателя (используйте teacher1 ... teacher10).');
        return;
    }
    setActiveUser(user);
    window.location.href = 'editor.html';
}

function handleRegister(e) {
    e.preventDefault();
    const fn = document.getElementById('reg-fn').value.trim();
    const ln = document.getElementById('reg-ln').value.trim();
    const dob = document.getElementById('reg-dob').value.trim();
    const un = document.getElementById('reg-un').value.trim();

    if (!fn || !ln || !dob || !un) {
        showError('Заполните все поля анкеты!');
        return;
    }

    const db = getDatabase();
    if (db.users.some(u => u.username.toLowerCase() === un.toLowerCase())) {
        showError('Этот логин уже занят! Придумайте другой.');
        return;
    }

    const newUser = { username: un, first_name: fn, last_name: ln, dob: dob, role: 'student' };
    db.users.push(newUser);

    const nextId = db.documents.reduce((max, d) => Math.max(max, d.id), 100) + 1;
    const nowTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    // Абсолютно пустой белый лист А4 без каких-либо примеров текста
    db.documents.push({
        id: nextId,
        owner: un,
        author: `${fn} ${ln}`,
        title: 'Документ 1',
        font: 'Montserrat',
        updated: nowTime,
        content: '<p><br></p>'
    });

    saveDatabase(db);
    setActiveUser(newUser);
    window.location.href = 'editor.html';
}

function logoutUser(e) {
    if (e) e.preventDefault();
    setActiveUser(null);
    window.location.href = 'index.html';
}
